#include "link.h"
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "host/ble_hs.h"
#include "host/ble_uuid.h"
#include "nimble/nimble_port.h"
#include "nimble/nimble_port_freertos.h"
#include "os/os_mbuf.h"
#include "services/gap/ble_svc_gap.h"
#include "services/gatt/ble_svc_gatt.h"

namespace {
constexpr uint16_t PACKET_MAGIC = 0x534E;
constexpr uint8_t PROTOCOL_VERSION = 1;
constexpr size_t COMMAND_BYTES = 20;
constexpr size_t TELEMETRY_BYTES = 48;
QueueHandle_t s_commands = nullptr;
uint16_t s_conn_handle = BLE_HS_CONN_HANDLE_NONE;
uint16_t s_telemetry_handle = 0;
uint8_t s_last_telemetry[TELEMETRY_BYTES]{};
bool s_radio_enabled = true;
uint8_t s_address_type = 0;

static const ble_uuid128_t SERVICE_UUID = BLE_UUID128_INIT(0x01,0x26,0x05,0x8f,0xb1,0x90,0x4b,0x58,0x9e,0x65,0x41,0x12,0x53,0x4e,0x52,0x47);
static const ble_uuid128_t COMMAND_UUID = BLE_UUID128_INIT(0x02,0x26,0x05,0x8f,0xb1,0x90,0x4b,0x58,0x9e,0x65,0x41,0x12,0x53,0x4e,0x52,0x47);
static const ble_uuid128_t TELEMETRY_UUID = BLE_UUID128_INIT(0x03,0x26,0x05,0x8f,0xb1,0x90,0x4b,0x58,0x9e,0x65,0x41,0x12,0x53,0x4e,0x52,0x47);

void put16(uint8_t *p, uint16_t v) { p[0] = v; p[1] = v >> 8; }
void put32(uint8_t *p, uint32_t v) { p[0]=v; p[1]=v>>8; p[2]=v>>16; p[3]=v>>24; }
uint16_t get16(const uint8_t *p) { return static_cast<uint16_t>(p[0] | (p[1] << 8)); }
uint32_t get32(const uint8_t *p) { return static_cast<uint32_t>(p[0]) | (static_cast<uint32_t>(p[1])<<8) | (static_cast<uint32_t>(p[2])<<16) | (static_cast<uint32_t>(p[3])<<24); }
uint16_t crc16(const uint8_t *data, size_t length) {
    uint16_t crc = 0xFFFF;
    for (size_t i = 0; i < length; ++i) {
        crc ^= static_cast<uint16_t>(data[i]) << 8;
        for (int bit = 0; bit < 8; ++bit) crc = (crc & 0x8000U) ? static_cast<uint16_t>((crc << 1) ^ 0x1021U) : static_cast<uint16_t>(crc << 1);
    }
    return crc;
}

void advertise();
int gap_event(ble_gap_event *event, void *) {
    if (event->type == BLE_GAP_EVENT_CONNECT) {
        if (event->connect.status == 0) s_conn_handle = event->connect.conn_handle;
        else advertise();
    } else if (event->type == BLE_GAP_EVENT_DISCONNECT) {
        s_conn_handle = BLE_HS_CONN_HANDLE_NONE;
        if (s_radio_enabled) advertise();
    }
    return 0;
}

int command_access(uint16_t, uint16_t, ble_gatt_access_ctxt *ctxt, void *) {
    if (ctxt->op != BLE_GATT_ACCESS_OP_WRITE_CHR || OS_MBUF_PKTLEN(ctxt->om) != COMMAND_BYTES) return BLE_ATT_ERR_INVALID_ATTR_VALUE_LEN;
    uint8_t packet[COMMAND_BYTES]{};
    os_mbuf_copydata(ctxt->om, 0, COMMAND_BYTES, packet);
    if (get16(packet) != PACKET_MAGIC || packet[2] != PROTOCOL_VERSION || get16(packet + 16) != crc16(packet, 16)) return BLE_ATT_ERR_UNLIKELY;
    link_command_t command{static_cast<link_opcode_t>(packet[3]), get32(packet + 4), get32(packet + 8), get32(packet + 12)};
    return xQueueSend(s_commands, &command, 0) == pdTRUE ? 0 : BLE_ATT_ERR_INSUFFICIENT_RES;
}

int telemetry_access(uint16_t, uint16_t, ble_gatt_access_ctxt *ctxt, void *) {
    if (ctxt->op != BLE_GATT_ACCESS_OP_READ_CHR) return BLE_ATT_ERR_UNLIKELY;
    return os_mbuf_append(ctxt->om, s_last_telemetry, TELEMETRY_BYTES) == 0
        ? 0 : BLE_ATT_ERR_INSUFFICIENT_RES;
}

const ble_gatt_svc_def GATT_SERVICES[] = {{
    .type = BLE_GATT_SVC_TYPE_PRIMARY,
    .uuid = &SERVICE_UUID.u,
    .characteristics = (ble_gatt_chr_def[]) {
        {.uuid=&COMMAND_UUID.u, .access_cb=command_access, .flags=BLE_GATT_CHR_F_WRITE | BLE_GATT_CHR_F_WRITE_NO_RSP},
        {.uuid=&TELEMETRY_UUID.u, .access_cb=telemetry_access, .val_handle=&s_telemetry_handle, .flags=BLE_GATT_CHR_F_READ | BLE_GATT_CHR_F_NOTIFY},
        {0}
    }
}, {0}};

void advertise() {
    ble_hs_adv_fields fields{};
    const char *name = "SeaNergy-26058";
    fields.name = reinterpret_cast<const uint8_t *>(name);
    fields.name_len = strlen(name);
    fields.name_is_complete = 1;
    ble_gap_adv_set_fields(&fields);
    ble_gap_adv_params params{};
    params.conn_mode = BLE_GAP_CONN_MODE_UND;
    params.disc_mode = BLE_GAP_DISC_MODE_GEN;
    ble_gap_adv_start(s_address_type, nullptr, BLE_HS_FOREVER, &params, gap_event, nullptr);
}
void on_sync() { ble_hs_id_infer_auto(0, &s_address_type); advertise(); }
void host_task(void *) { nimble_port_run(); nimble_port_freertos_deinit(); }
}

esp_err_t link_init() {
    s_commands = xQueueCreate(8, sizeof(link_command_t));
    if (!s_commands) return ESP_ERR_NO_MEM;
    nimble_port_init();
    ble_svc_gap_init();
    ble_svc_gatt_init();
    ble_svc_gap_device_name_set("SeaNergy-26058");
    ble_gatts_count_cfg(GATT_SERVICES);
    ble_gatts_add_svcs(GATT_SERVICES);
    ble_hs_cfg.sync_cb = on_sync;
    nimble_port_freertos_init(host_task);
    return ESP_OK;
}

bool link_poll_command(link_command_t *out) { return xQueueReceive(s_commands, out, 0) == pdTRUE; }

void link_publish_telemetry(const telemetry_data_t &d) {
    if (!s_radio_enabled || s_conn_handle == BLE_HS_CONN_HANDLE_NONE) return;
    uint8_t p[TELEMETRY_BYTES]{};
    put16(p, PACKET_MAGIC); p[2]=PROTOCOL_VERSION; p[3]=0x81;
    put32(p+4,d.sequence); put32(p+8,d.uptime_ms); p[12]=static_cast<uint8_t>(d.state);
    p[13]=static_cast<uint8_t>(d.mode); p[14]=static_cast<uint8_t>(d.window); p[15]=d.flags;
    put32(p+16,d.frequency_hz); put32(p+20,d.sample_rate_hz); put16(p+24,static_cast<uint16_t>(d.temperature_centi_c));
    put16(p+26,d.tds_mg_l); put16(p+28,d.turbidity_ntu_x10); put16(p+30,d.battery_mv);
    put16(p+32,d.current_ma_x10); put32(p+34,d.energy_uj); put16(p+38,d.cpu_idle_permille);
    put16(p+40,d.adaptation_ms); put32(p+42,d.fault_bits); put16(p+46,crc16(p,46));
    memcpy(s_last_telemetry, p, sizeof(p));
    os_mbuf *om = ble_hs_mbuf_from_flat(p, sizeof(p));
    if (om) ble_gatts_notify_custom(s_conn_handle, s_telemetry_handle, om);
}

void link_set_radio_enabled(bool enabled) {
    s_radio_enabled = enabled;
    if (!enabled) ble_gap_adv_stop();
    else if (s_conn_handle == BLE_HS_CONN_HANDLE_NONE) advertise();
}
