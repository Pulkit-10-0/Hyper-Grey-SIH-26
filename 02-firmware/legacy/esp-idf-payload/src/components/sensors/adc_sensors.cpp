#include "esp_check.h"
#include "adc_sensors.h"
#include "board.h"
#include "driver/gpio.h"
#include "driver/i2c_master.h"
#include "esp_rom_sys.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

namespace {
constexpr uint8_t ADS_SENSOR_ADDRESS = 0x48;
constexpr uint8_t ADS_POT_ADDRESS = 0x49;
constexpr uint32_t I2C_HZ = 400000;
constexpr uint16_t ADS_FULL_SCALE_MV = 4096;
constexpr int MOVING_AVERAGE_SAMPLES = 8;
i2c_master_dev_handle_t s_sensor_adc = nullptr;
i2c_master_dev_handle_t s_pot_adc = nullptr;
uint16_t s_tds_history[MOVING_AVERAGE_SAMPLES]{};
uint16_t s_turb_history[MOVING_AVERAGE_SAMPLES]{};
int s_history_index = 0;
portMUX_TYPE s_onewire_lock = portMUX_INITIALIZER_UNLOCKED;

esp_err_t add_device(uint8_t address, i2c_master_dev_handle_t *out) {
    i2c_device_config_t cfg{};
    cfg.dev_addr_length = I2C_ADDR_BIT_LEN_7;
    cfg.device_address = address;
    cfg.scl_speed_hz = I2C_HZ;
    return i2c_master_bus_add_device(board_i2c_bus(), &cfg, out);
}

esp_err_t ads_read(i2c_master_dev_handle_t dev, uint8_t channel, int16_t *raw) {
    const uint16_t mux = static_cast<uint16_t>(0x04U + channel) << 12U;
    const uint16_t config = 0x8000U | mux | 0x0200U | 0x0100U | 0x0080U | 0x0003U;
    uint8_t command[3] = {0x01, static_cast<uint8_t>(config >> 8), static_cast<uint8_t>(config)};
    ESP_RETURN_ON_ERROR(i2c_master_transmit(dev, command, sizeof(command), 20), "adc", "config");
    vTaskDelay(pdMS_TO_TICKS(9));
    uint8_t pointer = 0x00;
    uint8_t data[2]{};
    ESP_RETURN_ON_ERROR(i2c_master_transmit_receive(dev, &pointer, 1, data, 2, 20), "adc", "conversion");
    *raw = static_cast<int16_t>((data[0] << 8U) | data[1]);
    return ESP_OK;
}

uint16_t raw_to_mv(int16_t raw) {
    if (raw <= 0) return 0;
    return static_cast<uint16_t>((static_cast<uint32_t>(raw) * ADS_FULL_SCALE_MV) / 32768U);
}

uint16_t average(uint16_t *history, uint16_t next) {
    history[s_history_index] = next;
    uint32_t sum = 0;
    for (int i = 0; i < MOVING_AVERAGE_SAMPLES; ++i) sum += history[i];
    return static_cast<uint16_t>(sum / MOVING_AVERAGE_SAMPLES);
}

bool onewire_reset() {
    portENTER_CRITICAL(&s_onewire_lock);
    gpio_set_direction(static_cast<gpio_num_t>(PIN_DS18B20), GPIO_MODE_OUTPUT_OD);
    gpio_set_level(static_cast<gpio_num_t>(PIN_DS18B20), 0);
    esp_rom_delay_us(480);
    gpio_set_direction(static_cast<gpio_num_t>(PIN_DS18B20), GPIO_MODE_INPUT);
    esp_rom_delay_us(70);
    const bool present = gpio_get_level(static_cast<gpio_num_t>(PIN_DS18B20)) == 0;
    esp_rom_delay_us(410);
    portEXIT_CRITICAL(&s_onewire_lock);
    return present;
}

void onewire_write_bit(bool value) {
    portENTER_CRITICAL(&s_onewire_lock);
    gpio_set_direction(static_cast<gpio_num_t>(PIN_DS18B20), GPIO_MODE_OUTPUT_OD);
    gpio_set_level(static_cast<gpio_num_t>(PIN_DS18B20), 0);
    esp_rom_delay_us(value ? 6 : 60);
    gpio_set_direction(static_cast<gpio_num_t>(PIN_DS18B20), GPIO_MODE_INPUT);
    esp_rom_delay_us(value ? 64 : 10);
    portEXIT_CRITICAL(&s_onewire_lock);
}

bool onewire_read_bit() {
    portENTER_CRITICAL(&s_onewire_lock);
    gpio_set_direction(static_cast<gpio_num_t>(PIN_DS18B20), GPIO_MODE_OUTPUT_OD);
    gpio_set_level(static_cast<gpio_num_t>(PIN_DS18B20), 0);
    esp_rom_delay_us(6);
    gpio_set_direction(static_cast<gpio_num_t>(PIN_DS18B20), GPIO_MODE_INPUT);
    esp_rom_delay_us(9);
    const bool value = gpio_get_level(static_cast<gpio_num_t>(PIN_DS18B20));
    esp_rom_delay_us(55);
    portEXIT_CRITICAL(&s_onewire_lock);
    return value;
}

void onewire_write_byte(uint8_t value) {
    for (int i = 0; i < 8; ++i) onewire_write_bit((value >> i) & 1U);
}
uint8_t onewire_read_byte() {
    uint8_t value = 0;
    for (int i = 0; i < 8; ++i) if (onewire_read_bit()) value |= 1U << i;
    return value;
}

int16_t read_temperature_centi_c() {
    if (!onewire_reset()) return INT16_MIN;
    onewire_write_byte(0xCC);
    onewire_write_byte(0x44);
    vTaskDelay(pdMS_TO_TICKS(750));
    if (!onewire_reset()) return INT16_MIN;
    onewire_write_byte(0xCC);
    onewire_write_byte(0xBE);
    const int16_t raw = static_cast<int16_t>(onewire_read_byte() | (onewire_read_byte() << 8U));
    return static_cast<int16_t>((static_cast<int32_t>(raw) * 100) / 16);
}
}

esp_err_t sensors_init() {
    gpio_set_pull_mode(static_cast<gpio_num_t>(PIN_DS18B20), GPIO_PULLUP_ONLY);
    ESP_RETURN_ON_ERROR(add_device(ADS_SENSOR_ADDRESS, &s_sensor_adc), "adc", "ADS sensor");
    ESP_RETURN_ON_ERROR(add_device(ADS_POT_ADDRESS, &s_pot_adc), "adc", "ADS pot");
    return ESP_OK;
}

esp_err_t sensors_read(sensor_snapshot_t *out) {
    if (!out) return ESP_ERR_INVALID_ARG;
    int16_t tds_raw = 0, turb_raw = 0, tds_pot = 0, turb_pot = 0, temp_pot = 0;
    ESP_RETURN_ON_ERROR(ads_read(s_sensor_adc, 0, &tds_raw), "adc", "tds");
    ESP_RETURN_ON_ERROR(ads_read(s_sensor_adc, 1, &turb_raw), "adc", "turbidity");
    board_set_pot_rail(true);
    vTaskDelay(pdMS_TO_TICKS(3));
    ESP_RETURN_ON_ERROR(ads_read(s_pot_adc, 0, &tds_pot), "adc", "tds pot");
    ESP_RETURN_ON_ERROR(ads_read(s_pot_adc, 1, &turb_pot), "adc", "turb pot");
    ESP_RETURN_ON_ERROR(ads_read(s_pot_adc, 2, &temp_pot), "adc", "temp pot");
    board_set_pot_rail(false);

    const uint16_t tds_mv = average(s_tds_history, raw_to_mv(tds_raw));
    const uint16_t turb_mv = average(s_turb_history, raw_to_mv(turb_raw));
    s_history_index = (s_history_index + 1) % MOVING_AVERAGE_SAMPLES;
    out->temperature_centi_c = read_temperature_centi_c();
    out->tds_mg_l = static_cast<uint16_t>((static_cast<uint32_t>(tds_mv) * 500U) / 1000U);
    out->turbidity_ntu_x10 = static_cast<uint16_t>((static_cast<uint32_t>(turb_mv) * 1000U) / 3300U);
    out->tds_pot_mv = raw_to_mv(tds_pot);
    out->turbidity_pot_mv = raw_to_mv(turb_pot);
    out->temperature_pot_mv = raw_to_mv(temp_pot);
    out->timestamp_ms = static_cast<uint32_t>(esp_timer_get_time() / 1000ULL);
    return ESP_OK;
}
