#include "hmi.h"
#include <string.h>
#include "board.h"
#include "driver/gpio.h"
#include "driver/i2c_master.h"
#include "esp_check.h"
#include "esp_timer.h"

namespace {
i2c_master_dev_handle_t s_oled = nullptr;
uint64_t s_last_change_ms = 0;
bool s_last_raw = false;
bool s_stable = false;
bool s_reported = false;
void send_command(uint8_t command) { uint8_t d[2]={0x00,command}; i2c_master_transmit(s_oled,d,2,20); }
void bar(uint8_t *fb, int page, int start, int width) {
    if (page < 0 || page > 7) return;
    for (int x=start; x<start+width && x<128; ++x) fb[page*128+x]=0x7E;
}
}

esp_err_t hmi_init() {
    i2c_device_config_t cfg{};
    cfg.dev_addr_length = I2C_ADDR_BIT_LEN_7;
    cfg.device_address = 0x3C;
    cfg.scl_speed_hz = 400000;
    ESP_RETURN_ON_ERROR(i2c_master_bus_add_device(board_i2c_bus(), &cfg, &s_oled), "hmi", "oled");
    const uint8_t init[] = {0xAE,0xD5,0x80,0xA8,0x3F,0xD3,0x00,0x40,0x8D,0x14,0x20,0x00,0xA1,0xC8,0xDA,0x12,0x81,0x7F,0xD9,0xF1,0xDB,0x40,0xA4,0xA6,0xAF};
    for (uint8_t command : init) send_command(command);
    return ESP_OK;
}

bool hmi_trigger_pressed() {
    const bool raw = gpio_get_level(static_cast<gpio_num_t>(PIN_TRIGGER)) == 0;
    const uint64_t now = esp_timer_get_time()/1000ULL;
    if (raw != s_last_raw) { s_last_raw=raw; s_last_change_ms=now; }
    if (now-s_last_change_ms >= 30 && raw != s_stable) { s_stable=raw; if (!raw) s_reported=false; }
    if (s_stable && !s_reported) { s_reported=true; return true; }
    return false;
}

void hmi_update(firmware_state_t state, uint32_t frequency_hz, uint16_t battery_mv, int16_t margin_db_x10) {
    static uint64_t last_ms=0;
    const uint64_t now=esp_timer_get_time()/1000ULL;
    if (now-last_ms < 200) return;
    last_ms=now;
    uint8_t fb[1024]{};
    bar(fb,1,4,static_cast<int>(state)*18+8);
    bar(fb,3,4,static_cast<int>((frequency_hz/1000U)>100?100:frequency_hz/1000U));
    bar(fb,5,4,battery_mv>3300?static_cast<int>((battery_mv-3300)/9):2);
    bar(fb,7,4,margin_db_x10>0?static_cast<int>(margin_db_x10/2):2);
    send_command(0x21); send_command(0); send_command(127); send_command(0x22); send_command(0); send_command(7);
    uint8_t packet[17]; packet[0]=0x40;
    for (int offset=0; offset<1024; offset+=16) { memcpy(packet+1,fb+offset,16); i2c_master_transmit(s_oled,packet,sizeof(packet),20); }
    gpio_set_level(static_cast<gpio_num_t>(PIN_STATUS_LED), state != firmware_state_t::FAULT);
}
