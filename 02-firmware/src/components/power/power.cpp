#include "power.h"
#include "board.h"
#include "driver/i2c_master.h"
#include "esp_check.h"
#include "esp_sleep.h"
#include "esp_timer.h"

namespace {
i2c_master_dev_handle_t s_ina = nullptr;
uint16_t s_bus_mv = 0;
uint16_t s_current_ma_x10 = 0;
uint64_t s_ping_start_us = 0;
uint32_t s_energy_uj = 0;
esp_err_t write_reg(uint8_t reg, uint16_t value) { uint8_t p[3]={reg,static_cast<uint8_t>(value>>8),static_cast<uint8_t>(value)}; return i2c_master_transmit(s_ina,p,3,20); }
esp_err_t read_reg(uint8_t reg, uint16_t *value) { uint8_t p[2]{}; esp_err_t e=i2c_master_transmit_receive(s_ina,&reg,1,p,2,20); *value=static_cast<uint16_t>((p[0]<<8)|p[1]); return e; }
}

esp_err_t power_init() {
    i2c_device_config_t cfg{}; cfg.dev_addr_length=I2C_ADDR_BIT_LEN_7; cfg.device_address=0x40; cfg.scl_speed_hz=400000;
    ESP_RETURN_ON_ERROR(i2c_master_bus_add_device(board_i2c_bus(),&cfg,&s_ina),"power","INA226");
    ESP_RETURN_ON_ERROR(write_reg(0x00,0x4127),"power","config");
    ESP_RETURN_ON_ERROR(write_reg(0x05,512),"power","calibration"); // 0.1 mA/bit with 0.1 ohm shunt.
    return ESP_OK;
}
void power_sample() {
    uint16_t raw_bus=0, raw_current=0;
    if (read_reg(0x02,&raw_bus)==ESP_OK) s_bus_mv=static_cast<uint16_t>((static_cast<uint32_t>(raw_bus)*125U)/100U);
    if (read_reg(0x04,&raw_current)==ESP_OK) s_current_ma_x10=raw_current;
}
void power_begin_ping() { power_sample(); s_energy_uj=0; s_ping_start_us=esp_timer_get_time(); }
uint32_t power_end_ping() {
    power_sample();
    const uint64_t duration_us=esp_timer_get_time()-s_ping_start_us;
    s_energy_uj=static_cast<uint32_t>((static_cast<uint64_t>(s_bus_mv)*s_current_ma_x10*duration_us)/10000000ULL);
    return s_energy_uj;
}
uint16_t power_battery_mv() { return s_bus_mv; }
uint16_t power_current_ma_x10() { return s_current_ma_x10; }
void power_light_sleep_ms(uint32_t ms) { esp_sleep_enable_timer_wakeup(static_cast<uint64_t>(ms)*1000ULL); esp_light_sleep_start(); }
