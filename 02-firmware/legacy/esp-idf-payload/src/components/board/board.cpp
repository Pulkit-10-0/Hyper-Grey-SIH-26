#include "board.h"
#include "driver/gpio.h"

namespace {
i2c_master_bus_handle_t s_bus = nullptr;
bool s_idle_level = false;
}

esp_err_t board_init() {
    const uint64_t outputs = (1ULL << PIN_IDLE_MARKER) | (1ULL << PIN_ENVELOPE_MARKER) |
                             (1ULL << PIN_POT_RAIL) | (1ULL << PIN_TX_ENABLE) |
                             (1ULL << PIN_STATUS_LED);
    gpio_config_t out{};
    out.pin_bit_mask = outputs;
    out.mode = GPIO_MODE_OUTPUT;
    out.pull_down_en = GPIO_PULLDOWN_DISABLE;
    out.pull_up_en = GPIO_PULLUP_DISABLE;
    out.intr_type = GPIO_INTR_DISABLE;
    ESP_ERROR_CHECK(gpio_config(&out));

    gpio_config_t trigger{};
    trigger.pin_bit_mask = 1ULL << PIN_TRIGGER;
    trigger.mode = GPIO_MODE_INPUT;
    trigger.pull_up_en = GPIO_PULLUP_ENABLE;
    trigger.intr_type = GPIO_INTR_DISABLE;
    ESP_ERROR_CHECK(gpio_config(&trigger));

    i2c_master_bus_config_t bus{};
    bus.i2c_port = I2C_NUM_0;
    bus.sda_io_num = static_cast<gpio_num_t>(PIN_I2C_SDA);
    bus.scl_io_num = static_cast<gpio_num_t>(PIN_I2C_SCL);
    bus.clk_source = I2C_CLK_SRC_DEFAULT;
    bus.glitch_ignore_cnt = 7;
    bus.flags.enable_internal_pullup = true;
    ESP_ERROR_CHECK(i2c_new_master_bus(&bus, &s_bus));
    board_set_tx_enabled(false);
    board_set_pot_rail(false);
    return ESP_OK;
}

i2c_master_bus_handle_t board_i2c_bus() { return s_bus; }
void board_set_tx_enabled(bool enabled) { gpio_set_level(static_cast<gpio_num_t>(PIN_TX_ENABLE), enabled); }
void board_set_pot_rail(bool enabled) { gpio_set_level(static_cast<gpio_num_t>(PIN_POT_RAIL), enabled); }
void board_set_envelope_marker(bool enabled) { gpio_set_level(static_cast<gpio_num_t>(PIN_ENVELOPE_MARKER), enabled); }
void board_toggle_idle_marker() {
    s_idle_level = !s_idle_level;
    gpio_set_level(static_cast<gpio_num_t>(PIN_IDLE_MARKER), s_idle_level);
}
