#include <Arduino.h>
#include "driver/adc.h"
#include "driver/i2s.h"

#define RX_ADC_CHANNEL ADC1_CHANNEL_6   // GPIO34
#define I2S_PORT I2S_NUM_0

// Decimal frames preserve the serial viewer protocol.
#define NUM_SAMPLES 4096

// I2S DMA samples the ADC.
#define RX_SAMPLE_RATE 200000

uint16_t samples[NUM_SAMPLES];

static void setupADCI2S()
{
    i2s_config_t i2s_config = {};
    i2s_config.mode =
        (i2s_mode_t)(
            I2S_MODE_MASTER |
            I2S_MODE_RX |
            I2S_MODE_ADC_BUILT_IN
        );

    i2s_config.sample_rate = RX_SAMPLE_RATE;
    i2s_config.bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT;
    i2s_config.channel_format = I2S_CHANNEL_FMT_ONLY_RIGHT;
    i2s_config.communication_format = I2S_COMM_FORMAT_I2S_MSB;
    i2s_config.intr_alloc_flags = ESP_INTR_FLAG_LEVEL1;
    i2s_config.dma_buf_count = 8;
    i2s_config.dma_buf_len = 256;
    i2s_config.use_apll = false;
    i2s_config.tx_desc_auto_clear = false;
    i2s_config.fixed_mclk = 0;

    i2s_driver_install(
        I2S_PORT,
        &i2s_config,
        0,
        nullptr
    );

    i2s_set_adc_mode(
        ADC_UNIT_1,
        RX_ADC_CHANNEL
    );

    i2s_adc_enable(I2S_PORT);

    // Discard startup samples.
    size_t bytesRead = 0;
    uint16_t dummy[256];

    for (int i = 0; i < 4; i++)
    {
        i2s_read(
            I2S_PORT,
            dummy,
            sizeof(dummy),
            &bytesRead,
            portMAX_DELAY
        );
    }
}

static uint16_t adcFromI2SWord(uint16_t raw)
{
    // Built-in ESP32 ADC data is left-aligned in the 16-bit I2S word.
    return (raw >> 4) & 0x0FFF;
}

void setup()
{
    Serial.begin(115200);
    delay(1000);

    adc1_config_width(ADC_WIDTH_BIT_12);

    adc1_config_channel_atten(
        RX_ADC_CHANNEL,
        ADC_ATTEN_DB_11
    );

    setupADCI2S();

    Serial.println();
    Serial.println("SEANERGY_RX_CAPTURE");
    Serial.println("READY");
}

void loop()
{
    Serial.println("CAPTURE_START");

    uint32_t startTime = micros();

    size_t bytesRead = 0;
    size_t bytesNeeded = sizeof(samples);
    uint8_t *destination = (uint8_t *)samples;
    size_t totalRead = 0;

    while (totalRead < bytesNeeded)
    {
        size_t justRead = 0;

        i2s_read(
            I2S_PORT,
            destination + totalRead,
            bytesNeeded - totalRead,
            &justRead,
            portMAX_DELAY
        );

        totalRead += justRead;
    }

    uint32_t endTime = micros();
    uint32_t elapsedUs = endTime - startTime;

    for (int i = 0; i < NUM_SAMPLES; i++)
    {
        samples[i] = adcFromI2SWord(samples[i]);
    }

    // Estimate the rate from the DMA read interval.
    float actualSampleRate =
        (float)NUM_SAMPLES /
        ((float)elapsedUs / 1000000.0f);

    Serial.println("CAPTURE_INFO");

    Serial.print("SAMPLES=");
    Serial.println(NUM_SAMPLES);

    Serial.print("ELAPSED_US=");
    Serial.println(elapsedUs);

    Serial.print("ACTUAL_FS=");
    Serial.println(actualSampleRate, 2);

    Serial.println("DATA_START");

    for (int i = 0; i < NUM_SAMPLES; i++)
    {
        Serial.println(samples[i]);
    }

    Serial.println("DATA_END");
    Serial.println();

    // Keep the viewer's one-second capture cadence.
    delay(1000);
}
