package expo.modules.seanergylink

import android.annotation.SuppressLint
import android.app.PendingIntent
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbManager
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.UUID
import kotlin.concurrent.thread

/**
 * The payload link, native half.
 *
 * Two transports live here because both need Android APIs that JavaScript
 * cannot reach: USB host mode over a Type-C to Type-C cable, and Bluetooth Low
 * Energy. The third transport, Wi-Fi, is a WebSocket and is implemented in
 * JavaScript, where it needs nothing native.
 *
 * Deliberately dependency-free. A serial library would bring a transitive
 * Gradle tree and a version to keep in step with the Android Gradle plugin; the
 * payload enumerates as a standard CDC-ACM device, which is about two hundred
 * lines to speak directly.
 *
 * Everything the payload emits is newline-delimited text, so this module does
 * no framing. It forwards bytes as they arrive and lets the JavaScript side
 * reassemble lines, which keeps partial reads and split frames in one place.
 */
class SeanergyLinkModule : Module() {

  // ---------------------------------------------------------------- state
  private var usbConnection: UsbDeviceConnection? = null
  private var usbInterface: UsbInterface? = null
  private var endpointIn: UsbEndpoint? = null
  private var endpointOut: UsbEndpoint? = null
  @Volatile private var usbRunning = false
  private var usbReader: Thread? = null
  private var permissionReceiver: BroadcastReceiver? = null

  private var gatt: BluetoothGatt? = null
  private var writeChar: BluetoothGattCharacteristic? = null
  private var scanning = false
  private var scanCb: ScanCallback? = null

  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("No app context")

  private companion object {
    const val ACTION_USB_PERMISSION = "in.seanergy.console.USB_PERMISSION"
    // Nordic UART Service, the de-facto serial-over-BLE profile.
    val NUS_SERVICE: UUID = UUID.fromString("6e400001-b5a3-f393-e0a9-e50e24dcca9e")
    val NUS_RX: UUID = UUID.fromString("6e400002-b5a3-f393-e0a9-e50e24dcca9e")
    val NUS_TX: UUID = UUID.fromString("6e400003-b5a3-f393-e0a9-e50e24dcca9e")
    val CCCD: UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
  }

  // ---------------------------------------------------------------- module
  override fun definition() = ModuleDefinition {
    Name("SeanergyLink")

    Events("onData", "onStatus", "onDevice")

    // ------------------------------------------------------------ USB
    AsyncFunction("listUsbDevices") {
      val manager = context.getSystemService(Context.USB_SERVICE) as UsbManager
      manager.deviceList.values.map { d ->
        mapOf(
          "id" to d.deviceId,
          "name" to (d.productName ?: d.deviceName),
          "vendorId" to d.vendorId,
          "productId" to d.productId,
          "serial" to safeSerial(d),
          "kind" to describe(d),
        )
      }
    }

    AsyncFunction("openUsb") { deviceId: Int, baud: Int ->
      val manager = context.getSystemService(Context.USB_SERVICE) as UsbManager
      val device = manager.deviceList.values.firstOrNull { it.deviceId == deviceId }
        ?: throw Exception("No USB device with id $deviceId. Replug the cable and rescan.")

      if (!manager.hasPermission(device)) {
        requestPermission(manager, device, baud)
        return@AsyncFunction mapOf("state" to "permission", "detail" to "Waiting for USB permission")
      }
      connectUsb(manager, device, baud)
      mapOf("state" to "up", "detail" to describe(device))
    }

    AsyncFunction("closeUsb") { closeUsb(); true }

    AsyncFunction("writeUsb") { text: String ->
      val out = endpointOut ?: throw Exception("USB link is not open")
      val conn = usbConnection ?: throw Exception("USB link is not open")
      val bytes = text.toByteArray(Charsets.UTF_8)
      val n = conn.bulkTransfer(out, bytes, bytes.size, 1500)
      if (n < 0) throw Exception("USB write failed")
      n
    }

    // ------------------------------------------------------------ BLE
    AsyncFunction("bleScan") { prefix: String ->
      startScan(prefix); true
    }

    AsyncFunction("bleStopScan") { stopScan(); true }

    AsyncFunction("bleConnect") { address: String ->
      connectBle(address); true
    }

    AsyncFunction("bleDisconnect") { closeBle(); true }

    AsyncFunction("writeBle") { text: String ->
      val g = gatt ?: throw Exception("Bluetooth link is not open")
      val c = writeChar ?: throw Exception("Payload exposes no writable characteristic")
      writeCharacteristic(g, c, text.toByteArray(Charsets.UTF_8))
      text.length
    }

    AsyncFunction("bluetoothReady") {
      val bm = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
      bm?.adapter?.isEnabled == true
    }

    OnDestroy { closeUsb(); closeBle(); stopScan() }
  }

  // ---------------------------------------------------------------- USB impl
  private fun safeSerial(d: UsbDevice): String =
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) d.serialNumber ?: "" else ""
    } catch (e: SecurityException) {
      ""
    }

  /** A human label for what is on the other end of the cable. */
  private fun describe(d: UsbDevice): String = when {
    d.vendorId == 0x303A -> "Espressif native USB (CDC-ACM)"
    d.vendorId == 0x10C4 -> "Silicon Labs CP210x bridge"
    d.vendorId == 0x1A86 -> "WCH CH34x bridge"
    d.vendorId == 0x0403 -> "FTDI bridge"
    hasCdc(d) -> "CDC-ACM serial"
    else -> "USB device ${d.vendorId}:${d.productId}"
  }

  private fun hasCdc(d: UsbDevice): Boolean {
    for (i in 0 until d.interfaceCount) {
      if (d.getInterface(i).interfaceClass == UsbConstants.USB_CLASS_CDC_DATA) return true
    }
    return false
  }

  private fun requestPermission(manager: UsbManager, device: UsbDevice, baud: Int) {
    permissionReceiver?.let { runCatching { context.unregisterReceiver(it) } }
    val receiver = object : BroadcastReceiver() {
      override fun onReceive(ctx: Context?, intent: Intent?) {
        if (intent?.action != ACTION_USB_PERMISSION) return
        runCatching { context.unregisterReceiver(this) }
        permissionReceiver = null
        val granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)
        if (!granted) {
          emitStatus("down", "USB permission refused")
          return
        }
        try {
          connectUsb(manager, device, baud)
        } catch (e: Exception) {
          emitStatus("down", e.message ?: "USB open failed")
        }
      }
    }
    permissionReceiver = receiver
    val flags =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0
    val intent = PendingIntent.getBroadcast(
      context, 0, Intent(ACTION_USB_PERMISSION).setPackage(context.packageName), flags,
    )
    val filter = IntentFilter(ACTION_USB_PERMISSION)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      @Suppress("UnspecifiedRegisterReceiverFlag")
      context.registerReceiver(receiver, filter)
    }
    emitStatus("connecting", "Asking for USB permission")
    manager.requestPermission(device, intent)
  }

  private fun connectUsb(manager: UsbManager, device: UsbDevice, baud: Int) {
    closeUsb()
    val conn = manager.openDevice(device)
      ?: throw Exception("Could not open the USB device. Another app may hold it.")

    // The data interface is the one carrying bulk endpoints. On a composite
    // CDC device that is usually interface 1; searching for it rather than
    // assuming an index keeps this working on boards that enumerate otherwise.
    var chosen: UsbInterface? = null
    var epIn: UsbEndpoint? = null
    var epOut: UsbEndpoint? = null
    var controlIndex = 0

    for (i in 0 until device.interfaceCount) {
      val intf = device.getInterface(i)
      if (intf.interfaceClass == UsbConstants.USB_CLASS_COMM) controlIndex = intf.id
      var inEp: UsbEndpoint? = null
      var outEp: UsbEndpoint? = null
      for (e in 0 until intf.endpointCount) {
        val ep = intf.getEndpoint(e)
        if (ep.type != UsbConstants.USB_ENDPOINT_XFER_BULK) continue
        if (ep.direction == UsbConstants.USB_DIR_IN) inEp = ep else outEp = ep
      }
      if (inEp != null && outEp != null && chosen == null) {
        chosen = intf; epIn = inEp; epOut = outEp
      }
    }

    if (chosen == null || epIn == null || epOut == null) {
      conn.close()
      throw Exception("No bulk endpoints found. Use the board's native USB port, not the UART port.")
    }
    if (!conn.claimInterface(chosen, true)) {
      conn.close()
      throw Exception("Could not claim the USB interface")
    }

    configureLine(conn, device, controlIndex, baud)

    usbConnection = conn
    usbInterface = chosen
    endpointIn = epIn
    endpointOut = epOut
    usbRunning = true
    emitStatus("up", describe(device))

    usbReader = thread(start = true, name = "seanergy-usb") {
      val buffer = ByteArray(4096)
      while (usbRunning) {
        val c = usbConnection ?: break
        val ep = endpointIn ?: break
        val n = try {
          c.bulkTransfer(ep, buffer, buffer.size, 250)
        } catch (e: Exception) {
          -1
        }
        if (n > 0) {
          sendEvent("onData", mapOf("text" to String(buffer, 0, n, Charsets.UTF_8)))
        } else if (n < 0 && !usbRunning) {
          break
        }
      }
    }
  }

  /**
   * CDC-ACM line setup. Best effort: a device that ignores these still streams,
   * because on native USB the baud rate is a fiction the host and device agree
   * to ignore. It matters only behind a real UART bridge.
   */
  private fun configureLine(
    conn: UsbDeviceConnection,
    device: UsbDevice,
    controlIndex: Int,
    baud: Int,
  ) {
    if (device.vendorId == 0x10C4) {
      // CP210x: enable the interface, then set the baud rate.
      conn.controlTransfer(0x41, 0x00, 0x0001, 0, null, 0, 1000)
      val b = byteArrayOf(
        (baud and 0xff).toByte(),
        ((baud shr 8) and 0xff).toByte(),
        ((baud shr 16) and 0xff).toByte(),
        ((baud shr 24) and 0xff).toByte(),
      )
      conn.controlTransfer(0x41, 0x1E, 0, 0, b, 4, 1000)
      return
    }
    // SET_LINE_CODING: baud, 1 stop bit, no parity, 8 data bits.
    val line = byteArrayOf(
      (baud and 0xff).toByte(),
      ((baud shr 8) and 0xff).toByte(),
      ((baud shr 16) and 0xff).toByte(),
      ((baud shr 24) and 0xff).toByte(),
      0, 0, 8,
    )
    conn.controlTransfer(0x21, 0x20, 0, controlIndex, line, line.size, 1000)
    // SET_CONTROL_LINE_STATE: assert DTR and RTS so the device starts sending.
    conn.controlTransfer(0x21, 0x22, 0x03, controlIndex, null, 0, 1000)
  }

  private fun closeUsb() {
    usbRunning = false
    usbReader?.let { runCatching { it.join(400) } }
    usbReader = null
    val conn = usbConnection
    val intf = usbInterface
    if (conn != null && intf != null) runCatching { conn.releaseInterface(intf) }
    runCatching { conn?.close() }
    usbConnection = null
    usbInterface = null
    endpointIn = null
    endpointOut = null
    permissionReceiver?.let { runCatching { context.unregisterReceiver(it) } }
    permissionReceiver = null
  }

  // ---------------------------------------------------------------- BLE impl
  @SuppressLint("MissingPermission")
  private fun startScan(prefix: String) {
    val bm = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    val adapter: BluetoothAdapter = bm?.adapter
      ?: throw Exception("This device has no Bluetooth adapter")
    if (!adapter.isEnabled) throw Exception("Bluetooth is switched off")
    val scanner = adapter.bluetoothLeScanner ?: throw Exception("No BLE scanner available")

    stopScan()
    val cb = object : ScanCallback() {
      override fun onScanResult(callbackType: Int, result: ScanResult?) {
        val dev = result?.device ?: return
        val name = try { dev.name } catch (e: SecurityException) { null } ?: return
        if (prefix.isNotEmpty() && !name.startsWith(prefix, ignoreCase = true)) return
        sendEvent(
          "onDevice",
          mapOf("name" to name, "address" to dev.address, "rssi" to (result.rssi)),
        )
      }

      override fun onScanFailed(errorCode: Int) {
        emitStatus("down", "Bluetooth scan failed, code $errorCode")
      }
    }
    scanCb = cb
    scanning = true
    emitStatus("scanning", "Scanning for $prefix")
    val settings = ScanSettings.Builder()
      .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
      .build()
    scanner.startScan(null, settings, cb)
  }

  @SuppressLint("MissingPermission")
  private fun stopScan() {
    if (!scanning) return
    scanning = false
    val bm = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    val scanner = bm?.adapter?.bluetoothLeScanner
    scanCb?.let { cb -> runCatching { scanner?.stopScan(cb) } }
    scanCb = null
  }

  @SuppressLint("MissingPermission")
  private fun connectBle(address: String) {
    stopScan()
    closeBle()
    val bm = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    val adapter = bm?.adapter ?: throw Exception("This device has no Bluetooth adapter")
    val device: BluetoothDevice = adapter.getRemoteDevice(address)
    emitStatus("connecting", "Connecting to $address")

    val callback = object : BluetoothGattCallback() {
      override fun onConnectionStateChange(g: BluetoothGatt, status: Int, newState: Int) {
        if (newState == BluetoothProfile.STATE_CONNECTED) {
          emitStatus("connecting", "Discovering services")
          runCatching { g.discoverServices() }
        } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
          emitStatus("down", "Payload disconnected")
        }
      }

      override fun onServicesDiscovered(g: BluetoothGatt, status: Int) {
        // Prefer the Nordic UART service; otherwise take the first characteristic
        // that can notify, which covers a payload using its own UUIDs.
        var notify: BluetoothGattCharacteristic? = null
        var write: BluetoothGattCharacteristic? = null
        g.getService(NUS_SERVICE)?.let { svc ->
          notify = svc.getCharacteristic(NUS_TX)
          write = svc.getCharacteristic(NUS_RX)
        }
        if (notify == null) {
          outer@ for (svc in g.services) {
            for (c in svc.characteristics) {
              val p = c.properties
              if (notify == null && (p and BluetoothGattCharacteristic.PROPERTY_NOTIFY) != 0) {
                notify = c
              }
              if (write == null &&
                (p and (BluetoothGattCharacteristic.PROPERTY_WRITE or
                  BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE)) != 0
              ) {
                write = c
              }
              if (notify != null && write != null) break@outer
            }
          }
        }
        writeChar = write
        val n = notify
        if (n == null) {
          emitStatus("down", "Payload exposes no notifying characteristic")
          return
        }
        g.setCharacteristicNotification(n, true)
        n.getDescriptor(CCCD)?.let { d ->
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            g.writeDescriptor(d, BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE)
          } else {
            @Suppress("DEPRECATION")
            d.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
            @Suppress("DEPRECATION")
            g.writeDescriptor(d)
          }
        }
        runCatching { g.requestMtu(185) }
        emitStatus("up", "Bluetooth LE")
      }

      @Suppress("DEPRECATION")
      override fun onCharacteristicChanged(g: BluetoothGatt, c: BluetoothGattCharacteristic) {
        val v = c.value ?: return
        sendEvent("onData", mapOf("text" to String(v, Charsets.UTF_8)))
      }

      override fun onCharacteristicChanged(
        g: BluetoothGatt,
        c: BluetoothGattCharacteristic,
        value: ByteArray,
      ) {
        sendEvent("onData", mapOf("text" to String(value, Charsets.UTF_8)))
      }
    }

    gatt = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      device.connectGatt(context, false, callback, BluetoothDevice.TRANSPORT_LE)
    } else {
      device.connectGatt(context, false, callback)
    }
  }

  @SuppressLint("MissingPermission")
  private fun writeCharacteristic(
    g: BluetoothGatt,
    c: BluetoothGattCharacteristic,
    bytes: ByteArray,
  ) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      g.writeCharacteristic(c, bytes, BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT)
    } else {
      @Suppress("DEPRECATION")
      c.value = bytes
      @Suppress("DEPRECATION")
      g.writeCharacteristic(c)
    }
  }

  @SuppressLint("MissingPermission")
  private fun closeBle() {
    val g = gatt ?: return
    runCatching { g.disconnect() }
    runCatching { g.close() }
    gatt = null
    writeChar = null
  }

  // ---------------------------------------------------------------- events
  private fun emitStatus(state: String, detail: String) {
    sendEvent("onStatus", mapOf("state" to state, "detail" to detail))
  }
}
