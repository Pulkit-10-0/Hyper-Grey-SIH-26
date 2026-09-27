#include <Arduino.h>
#include <Wire.h>

#include <Adafruit_ADS1X15.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#include <ESP_I2S.h>
#include <U8g2lib.h>

#include <math.h>


// ============================================================
// PIN CONFIGURATION
// ============================================================

// ------------------------------------------------------------
// MAIN HARDWARE I2C BUS
// ADS1115 #1 + OLED #1
// ------------------------------------------------------------

#define I2C_SDA_PIN 8
#define I2C_SCL_PIN 9


// ------------------------------------------------------------
// OLED #2 - SOFTWARE I2C
// ------------------------------------------------------------

#define OLED2_SDA 10
#define OLED2_SCL 11


// ------------------------------------------------------------
// OLED #3 - SOFTWARE I2C
// ------------------------------------------------------------

#define OLED3_SDA 12
#define OLED3_SCL 13


// ------------------------------------------------------------
// OLED #4 - SOFTWARE I2C
// ------------------------------------------------------------

#define OLED4_SDA 14
#define OLED4_SCL 15


// ------------------------------------------------------------
// DS18B20
// ------------------------------------------------------------

#define DS18B20_PIN 4


// ------------------------------------------------------------
// MAX98357A
// ------------------------------------------------------------

#define I2S_BCLK_PIN 5
#define I2S_LRC_PIN  6
#define I2S_DIN_PIN  7


// ------------------------------------------------------------
// 40 kHz ULTRASONIC TX
// ------------------------------------------------------------

#define TX_PIN 16
#define TX_FREQUENCY 40000
#define TX_RESOLUTION 8


// ============================================================
// ADS1115 CHANNELS
// ============================================================

// ADS1115 #1 = REAL SENSORS

#define TDS_ADC_CHANNEL       0
#define TURBIDITY_ADC_CHANNEL 1


// ADS1115 #2 = POTENTIOMETERS

#define TDS_POT_CHANNEL        0
#define TURBIDITY_POT_CHANNEL  1
#define TEMP_POT_CHANNEL       2


// ============================================================
// ADS1115 I2C ADDRESSES
// ============================================================

#define ADS1_ADDRESS 0x48
#define ADS2_ADDRESS 0x49


// ============================================================
// AUDIO
// ============================================================

#define SAMPLE_RATE 44100

#define TEST_FREQUENCY 1000.0

#define AUDIO_AMPLITUDE 0.20

#define AUDIO_BUFFER_SAMPLES 256


// ============================================================
// OBJECTS
// ============================================================

// ------------------------------------------------------------
// ADS1115 #1
// REAL SENSORS
// ------------------------------------------------------------

Adafruit_ADS1115 ads1;


// ------------------------------------------------------------
// ADS1115 #2
// POTENTIOMETERS
// ------------------------------------------------------------

Adafruit_ADS1115 ads2;


// ------------------------------------------------------------
// DS18B20
// ------------------------------------------------------------

OneWire oneWire(DS18B20_PIN);

DallasTemperature temperatureSensor(&oneWire);


// ------------------------------------------------------------
// I2S
// ------------------------------------------------------------

I2SClass I2S;


// ============================================================
// OLED OBJECTS
// ============================================================

// OLED #1
U8G2_SSD1306_128X64_NONAME_F_HW_I2C oled1(
    U8G2_R0,
    U8X8_PIN_NONE
);


// OLED #2
U8G2_SSD1306_128X64_NONAME_F_SW_I2C oled2(
    U8G2_R0,
    OLED2_SCL,
    OLED2_SDA,
    U8X8_PIN_NONE
);


// OLED #3
U8G2_SSD1306_128X64_NONAME_F_SW_I2C oled3(
    U8G2_R0,
    OLED3_SCL,
    OLED3_SDA,
    U8X8_PIN_NONE
);


// OLED #4
U8G2_SSD1306_128X64_NONAME_F_SW_I2C oled4(
    U8G2_R0,
    OLED4_SCL,
    OLED4_SDA,
    U8X8_PIN_NONE
);


// ============================================================
// AUDIO BUFFER
// ============================================================

int16_t audioBuffer[AUDIO_BUFFER_SAMPLES];

float audioPhase = 0.0;


// ============================================================
// REAL SENSOR VARIABLES
// ============================================================

float temperatureC = DEVICE_DISCONNECTED_C;

int16_t tdsRaw = 0;
float tdsVoltage = 0.0;

int16_t turbidityRaw = 0;
float turbidityVoltage = 0.0;


// ============================================================
// POTENTIOMETER VARIABLES
// ============================================================

int16_t tdsPotRaw = 0;
float tdsPotVoltage = 0.0;

int16_t turbidityPotRaw = 0;
float turbidityPotVoltage = 0.0;

int16_t tempPotRaw = 0;
float tempPotVoltage = 0.0;


// ============================================================
// GENERATE AUDIO TONE
// ============================================================

void generateTone()
{
    float phaseIncrement =
        2.0 * PI * TEST_FREQUENCY / SAMPLE_RATE;


    for (int i = 0; i < AUDIO_BUFFER_SAMPLES; i++)
    {
        float sample =
            sin(audioPhase) * AUDIO_AMPLITUDE;


        audioBuffer[i] =
            (int16_t)(sample * 32767.0);


        audioPhase += phaseIncrement;


        if (audioPhase >= 2.0 * PI)
        {
            audioPhase -= 2.0 * PI;
        }
    }
}


// ============================================================
// READ REAL SENSORS
// ============================================================

void readRealSensors()
{
    // --------------------------------------------------------
    // DS18B20
    // --------------------------------------------------------

    temperatureSensor.requestTemperatures();

    temperatureC =
        temperatureSensor.getTempCByIndex(0);


    // --------------------------------------------------------
    // REAL TDS
    // --------------------------------------------------------

    tdsRaw =
        ads1.readADC_SingleEnded(TDS_ADC_CHANNEL);

    tdsVoltage =
        2.0f * ads1.computeVolts(tdsRaw); // Rev A PCB: undo the 10k/10k input divider.


    // --------------------------------------------------------
    // REAL TURBIDITY
    // --------------------------------------------------------

    turbidityRaw =
        ads1.readADC_SingleEnded(TURBIDITY_ADC_CHANNEL);

    turbidityVoltage =
        2.0f * ads1.computeVolts(turbidityRaw); // Rev A PCB: undo the 10k/10k input divider.
}


// ============================================================
// READ POTENTIOMETERS
// ============================================================

void readPotentiometers()
{
    // --------------------------------------------------------
    // TDS POT
    // --------------------------------------------------------

    tdsPotRaw =
        ads2.readADC_SingleEnded(TDS_POT_CHANNEL);

    tdsPotVoltage =
        ads2.computeVolts(tdsPotRaw);


    // --------------------------------------------------------
    // TURBIDITY POT
    // --------------------------------------------------------

    turbidityPotRaw =
        ads2.readADC_SingleEnded(TURBIDITY_POT_CHANNEL);

    turbidityPotVoltage =
        ads2.computeVolts(turbidityPotRaw);


    // --------------------------------------------------------
    // TEMPERATURE POT
    // --------------------------------------------------------

    tempPotRaw =
        ads2.readADC_SingleEnded(TEMP_POT_CHANNEL);

    tempPotVoltage =
        ads2.computeVolts(tempPotRaw);
}


// ============================================================
// OLED #1
// ============================================================

void updateOLED1()
{
    oled1.clearBuffer();

    oled1.setFont(u8g2_font_6x10_tf);


    oled1.drawStr(
        0,
        10,
        "REAL SENSORS"
    );


    oled1.drawHLine(
        0,
        13,
        128
    );


    // Temperature

    oled1.drawStr(
        0,
        27,
        "TEMP:"
    );

    oled1.setCursor(
        45,
        27
    );

    if (temperatureC == DEVICE_DISCONNECTED_C)
    {
        oled1.print("ERROR");
    }
    else
    {
        oled1.print(
            temperatureC,
            1
        );

        oled1.print(" C");
    }


    // TDS

    oled1.drawStr(
        0,
        42,
        "TDS:"
    );

    oled1.setCursor(
        45,
        42
    );

    oled1.print(
        tdsVoltage,
        3
    );

    oled1.print(" V");


    // Turbidity

    oled1.drawStr(
        0,
        57,
        "TURB:"
    );

    oled1.setCursor(
        45,
        57
    );

    oled1.print(
        turbidityVoltage,
        3
    );

    oled1.print(" V");


    oled1.sendBuffer();
}


// ============================================================
// OLED #2
// ============================================================

void updateOLED2()
{
    oled2.clearBuffer();

    oled2.setFont(u8g2_font_6x10_tf);


    oled2.drawStr(
        0,
        10,
        "POT INPUTS"
    );


    oled2.drawHLine(
        0,
        13,
        128
    );


    // TDS POT

    oled2.drawStr(
        0,
        27,
        "TDS POT"
    );

    oled2.setCursor(
        65,
        27
    );

    oled2.print(
        tdsPotVoltage,
        2
    );

    oled2.print("V");


    // Turbidity POT

    oled2.drawStr(
        0,
        42,
        "TURB POT"
    );

    oled2.setCursor(
        65,
        42
    );

    oled2.print(
        turbidityPotVoltage,
        2
    );

    oled2.print("V");


    // Temperature POT

    oled2.drawStr(
        0,
        57,
        "TEMP POT"
    );

    oled2.setCursor(
        65,
        57
    );

    oled2.print(
        tempPotVoltage,
        2
    );

    oled2.print("V");


    oled2.sendBuffer();
}


// ============================================================
// OLED #3
// ============================================================

void updateOLED3()
{
    oled3.clearBuffer();

    oled3.setFont(u8g2_font_6x10_tf);


    oled3.drawStr(
        0,
        10,
        "AUDIO ENGINE"
    );


    oled3.drawHLine(
        0,
        13,
        128
    );


    oled3.drawStr(
        0,
        28,
        "FREQUENCY"
    );

    oled3.setCursor(
        65,
        28
    );

    oled3.print(
        TEST_FREQUENCY,
        0
    );

    oled3.print(" Hz");


    oled3.drawStr(
        0,
        44,
        "SAMPLE RATE"
    );

    oled3.setCursor(
        65,
        44
    );

    oled3.print(
        SAMPLE_RATE
    );


    oled3.drawStr(
        0,
        60,
        "I2S ACTIVE"
    );


    oled3.sendBuffer();
}


// ============================================================
// OLED #4
// ============================================================

void updateOLED4()
{
    oled4.clearBuffer();

    oled4.setFont(u8g2_font_6x10_tf);


    oled4.drawStr(
        0,
        10,
        "ADC STATUS"
    );


    oled4.drawHLine(
        0,
        13,
        128
    );


    oled4.drawStr(
        0,
        28,
        "TDS RAW"
    );

    oled4.setCursor(
        65,
        28
    );

    oled4.print(
        tdsRaw
    );


    oled4.drawStr(
        0,
        44,
        "TURB RAW"
    );

    oled4.setCursor(
        65,
        44
    );

    oled4.print(
        turbidityRaw
    );


    oled4.drawStr(
        0,
        60,
        "ADC2 ONLINE"
    );


    oled4.sendBuffer();
}


// ============================================================
// UPDATE ALL DISPLAYS
// ============================================================

void updateDisplays()
{
    updateOLED1();

    updateOLED2();

    updateOLED3();

    updateOLED4();
}


// ============================================================
// SETUP
// ============================================================

void setup()
{
    Serial.begin(115200);

    delay(1000);


    // ========================================================
    // 40 kHz ULTRASONIC TX
    // ========================================================

    pinMode(TX_PIN, OUTPUT);

    ledcAttach(
        TX_PIN,
        TX_FREQUENCY,
        TX_RESOLUTION
    );

    // 50% duty cycle
    ledcWrite(
        TX_PIN,
        128
    );


    Serial.println();
    Serial.println("40 kHz ultrasonic TX active on GPIO16.");
    Serial.println();


    Serial.println();

    Serial.println(
        "======================================"
    );

    Serial.println(
        " AUV SENSOR + AUDIO + POT SYSTEM"
    );

    Serial.println(
        "======================================"
    );

    Serial.println();


    // ========================================================
    // HARDWARE I2C
    // ========================================================

    Serial.println(
        "Starting hardware I2C..."
    );


    Wire.begin(
        I2C_SDA_PIN,
        I2C_SCL_PIN
    );


    Wire.setClock(100000);

    delay(100);


    // ========================================================
    // ADS1115 #1
    // ========================================================

    Serial.println(
        "Starting ADS1115 #1..."
    );


    if (!ads1.begin(
            ADS1_ADDRESS,
            &Wire))
    {
        Serial.println(
            "ERROR: ADS1115 #1 NOT FOUND!"
        );

        while (1)
        {
            delay(1000);
        }
    }


    Serial.println(
        "ADS1115 #1 detected."
    );


    ads1.setGain(GAIN_ONE);


    // ========================================================
    // ADS1115 #2
    // ========================================================

    Serial.println(
        "Starting ADS1115 #2..."
    );


    if (!ads2.begin(
            ADS2_ADDRESS,
            &Wire))
    {
        Serial.println(
            "ERROR: ADS1115 #2 NOT FOUND!"
        );

        Serial.println(
            "Check ADDR of ADS1115 #2 -> 3.3V"
        );

        while (1)
        {
            delay(1000);
        }
    }


    Serial.println(
        "ADS1115 #2 detected."
    );


    ads2.setGain(GAIN_ONE);


    // ========================================================
    // DS18B20
    // ========================================================

    Serial.println();

    Serial.println(
        "Starting DS18B20..."
    );


    temperatureSensor.begin();


    int sensorCount =
        temperatureSensor.getDeviceCount();


    Serial.print(
        "DS18B20 sensors found: "
    );

    Serial.println(
        sensorCount
    );


    // ========================================================
    // OLED #1
    // ========================================================

    Serial.println();

    Serial.println(
        "Starting OLED #1..."
    );


    oled1.setI2CAddress(
        0x3C << 1
    );

    oled1.begin();


    Serial.println(
        "OLED #1 OK"
    );


    // ========================================================
    // OLED #2
    // ========================================================

    Serial.println(
        "Starting OLED #2..."
    );


    oled2.setI2CAddress(
        0x3C << 1
    );

    oled2.begin();


    Serial.println(
        "OLED #2 OK"
    );


    // ========================================================
    // OLED #3
    // ========================================================

    Serial.println(
        "Starting OLED #3..."
    );


    oled3.setI2CAddress(
        0x3C << 1
    );

    oled3.begin();


    Serial.println(
        "OLED #3 OK"
    );


    // ========================================================
    // OLED #4
    // ========================================================

    Serial.println(
        "Starting OLED #4..."
    );


    oled4.setI2CAddress(
        0x3C << 1
    );

    oled4.begin();


    Serial.println(
        "OLED #4 OK"
    );


    // ========================================================
    // INITIAL OLED MESSAGE
    // ========================================================

    oled1.clearBuffer();

    oled1.setFont(
        u8g2_font_6x10_tf
    );

    oled1.drawStr(
        10,
        30,
        "AUV SYSTEM"
    );

    oled1.drawStr(
        10,
        45,
        "STARTING..."
    );

    oled1.sendBuffer();


    oled2.clearBuffer();

    oled2.setFont(
        u8g2_font_6x10_tf
    );

    oled2.drawStr(
        10,
        30,
        "OLED #2"
    );

    oled2.drawStr(
        10,
        45,
        "ONLINE"
    );

    oled2.sendBuffer();


    oled3.clearBuffer();

    oled3.setFont(
        u8g2_font_6x10_tf
    );

    oled3.drawStr(
        10,
        30,
        "OLED #3"
    );

    oled3.drawStr(
        10,
        45,
        "ONLINE"
    );

    oled3.sendBuffer();


    oled4.clearBuffer();

    oled4.setFont(
        u8g2_font_6x10_tf
    );

    oled4.drawStr(
        10,
        30,
        "OLED #4"
    );

    oled4.drawStr(
        10,
        45,
        "ONLINE"
    );

    oled4.sendBuffer();


    delay(500);


    // ========================================================
    // I2S
    // ========================================================

    Serial.println();

    Serial.println(
        "Starting I2S audio..."
    );


    I2S.setPins(
        I2S_BCLK_PIN,
        I2S_LRC_PIN,
        I2S_DIN_PIN
    );


    if (!I2S.begin(
            I2S_MODE_STD,
            SAMPLE_RATE,
            I2S_DATA_BIT_WIDTH_16BIT,
            I2S_SLOT_MODE_MONO))
    {
        Serial.println(
            "ERROR: I2S initialization failed!"
        );

        while (1)
        {
            delay(1000);
        }
    }


    Serial.println(
        "I2S started."
    );


    Serial.println(
        "MAX98357A ready."
    );


    Serial.println();

    Serial.println(
        "======================================"
    );

    Serial.println(
        "SYSTEM READY"
    );

    Serial.println(
        "======================================"
    );

    Serial.println();
}


// ============================================================
// LOOP
// ============================================================

void loop()
{
    // ========================================================
    // READ REAL SENSORS
    // ========================================================

    readRealSensors();


    // ========================================================
    // READ POTENTIOMETERS
    // ========================================================

    readPotentiometers();


    // ========================================================
    // AUDIO
    // ========================================================

    generateTone();


    I2S.write(
        (uint8_t*)audioBuffer,
        sizeof(audioBuffer)
    );


    // ========================================================
    // DISPLAY UPDATE
    // ========================================================

    static unsigned long lastDisplayUpdate = 0;


    if (
        millis() - lastDisplayUpdate >= 500
    )
    {
        lastDisplayUpdate = millis();

        updateDisplays();
    }


    // ========================================================
    // SERIAL OUTPUT
    // ========================================================

    static unsigned long lastSerialPrint = 0;


    if (
        millis() - lastSerialPrint >= 1000
    )
    {
        lastSerialPrint = millis();


        Serial.println(
            "--------------------------------------"
        );


        // ----------------------------------------------------
        // REAL TEMPERATURE
        // ----------------------------------------------------

        Serial.print(
            "REAL Temperature : "
        );


        if (
            temperatureC ==
            DEVICE_DISCONNECTED_C
        )
        {
            Serial.println(
                "ERROR"
            );
        }
        else
        {
            Serial.print(
                temperatureC,
                2
            );

            Serial.println(
                " C"
            );
        }


        // ----------------------------------------------------
        // REAL TDS
        // ----------------------------------------------------

        Serial.print(
            "REAL TDS ADC     : "
        );

        Serial.println(
            tdsRaw
        );


        Serial.print(
            "REAL TDS Voltage : "
        );

        Serial.print(
            tdsVoltage,
            4
        );

        Serial.println(
            " V"
        );


        // ----------------------------------------------------
        // REAL TURBIDITY
        // ----------------------------------------------------

        Serial.print(
            "REAL Turb ADC    : "
        );

        Serial.println(
            turbidityRaw
        );


        Serial.print(
            "REAL Turb Voltage: "
        );

        Serial.print(
            turbidityVoltage,
            4
        );

        Serial.println(
            " V"
        );


        // ----------------------------------------------------
        // TDS POT
        // ----------------------------------------------------

        Serial.print(
            "TDS POT ADC      : "
        );

        Serial.println(
            tdsPotRaw
        );


        Serial.print(
            "TDS POT Voltage  : "
        );

        Serial.print(
            tdsPotVoltage,
            4
        );

        Serial.println(
            " V"
        );


        // ----------------------------------------------------
        // TURBIDITY POT
        // ----------------------------------------------------

        Serial.print(
            "TURB POT ADC     : "
        );

        Serial.println(
            turbidityPotRaw
        );


        Serial.print(
            "TURB POT Voltage : "
        );

        Serial.print(
            turbidityPotVoltage,
            4
        );

        Serial.println(
            " V"
        );


        // ----------------------------------------------------
        // TEMPERATURE POT
        // ----------------------------------------------------

        Serial.print(
            "TEMP POT ADC     : "
        );

        Serial.println(
            tempPotRaw
        );


        Serial.print(
            "TEMP POT Voltage : "
        );

        Serial.print(
            tempPotVoltage,
            4
        );

        Serial.println(
            " V"
        );


        // ----------------------------------------------------
        // AUDIO
        // ----------------------------------------------------

        Serial.print(
            "Audio            : "
        );

        Serial.print(
            TEST_FREQUENCY,
            0
        );

        Serial.println(
            " Hz"
        );


        Serial.println(
            "--------------------------------------"
        );
    }
}