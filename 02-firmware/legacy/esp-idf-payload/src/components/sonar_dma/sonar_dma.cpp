#include "sonar_dma.h"
#include "board.h"
#include "dds.h"
#include "window.h"
#include "driver/gptimer.h"
#include "esp_attr.h"
#include "esp_check.h"
#include "esp_lcd_io_i80.h"
#include "esp_lcd_panel_io.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"

namespace {
constexpr size_t DMA_SAMPLES = 1024; // 512 us per block at 2 MSps.
DMA_ATTR uint8_t s_buffers[2][DMA_SAMPLES];
esp_lcd_i80_bus_handle_t s_bus = nullptr;
esp_lcd_panel_io_handle_t s_io = nullptr;
gptimer_handle_t s_timer = nullptr;
SemaphoreHandle_t s_start_sem = nullptr;
SemaphoreHandle_t s_done_sem = nullptr;

bool IRAM_ATTR timer_alarm(gptimer_handle_t, const gptimer_alarm_event_data_t *, void *) {
    BaseType_t awake = pdFALSE;
    xSemaphoreGiveFromISR(s_start_sem, &awake);
    return awake == pdTRUE;
}
bool IRAM_ATTR transfer_done(esp_lcd_panel_io_handle_t, esp_lcd_panel_io_event_data_t *, void *) {
    BaseType_t awake = pdFALSE;
    xSemaphoreGiveFromISR(s_done_sem, &awake);
    return awake == pdTRUE;
}
void fill_block(uint8_t *dst, uint32_t offset, uint32_t count, uint32_t total,
                dds_oscillator_t *osc, window_type_t window, uint16_t amplitude_q15) {
    for (uint32_t j = 0; j < count; ++j) {
        const int32_t wave = dds_next_q15(osc);
        const int32_t envelope = window_gain_q15(window, offset + j, total);
        const int32_t scaled = (((wave * envelope) >> 15) * amplitude_q15) >> 15;
        dst[j] = static_cast<uint8_t>((scaled + 32768) >> 8);
    }
}
}

esp_err_t sonar_dma_init() {
    s_start_sem = xSemaphoreCreateBinary();
    s_done_sem = xSemaphoreCreateBinary();
    if (!s_start_sem || !s_done_sem) return ESP_ERR_NO_MEM;

    esp_lcd_i80_bus_config_t bus{};
    bus.dc_gpio_num = -1;
    bus.wr_gpio_num = PIN_DAC_WR;
    bus.clk_src = LCD_CLK_SRC_PLL160M;
    for (int i = 0; i < 8; ++i) bus.data_gpio_nums[i] = PIN_DAC_DATA[i];
    bus.bus_width = 8;
    bus.max_transfer_bytes = DMA_SAMPLES;
    bus.dma_burst_size = 64;
    ESP_ERROR_CHECK(esp_lcd_new_i80_bus(&bus, &s_bus));

    esp_lcd_panel_io_i80_config_t io{};
    io.cs_gpio_num = PIN_DAC_CS;
    io.pclk_hz = 20000000;
    io.trans_queue_depth = 2;
    io.lcd_cmd_bits = 8;
    io.lcd_param_bits = 8;
    io.on_color_trans_done = transfer_done;
    ESP_ERROR_CHECK(esp_lcd_new_panel_io_i80(s_bus, &io, &s_io));

    gptimer_config_t timer{};
    timer.clk_src = GPTIMER_CLK_SRC_DEFAULT;
    timer.direction = GPTIMER_COUNT_UP;
    timer.resolution_hz = 1000000; // 1 tick per microsecond.
    ESP_ERROR_CHECK(gptimer_new_timer(&timer, &s_timer));
    gptimer_event_callbacks_t callbacks{};
    callbacks.on_alarm = timer_alarm;
    ESP_ERROR_CHECK(gptimer_register_event_callbacks(s_timer, &callbacks, nullptr));
    ESP_ERROR_CHECK(gptimer_enable(s_timer));
    return ESP_OK;
}

esp_err_t sonar_dma_transmit(const solver_plan_t &plan, uint32_t start_delay_us) {
    gptimer_alarm_config_t alarm{};
    alarm.alarm_count = start_delay_us;
    alarm.reload_count = 0;
    alarm.flags.auto_reload_on_alarm = false;
    ESP_RETURN_ON_ERROR(gptimer_set_raw_count(s_timer, 0), "dma", "timer reset");
    ESP_RETURN_ON_ERROR(gptimer_set_alarm_action(s_timer, &alarm), "dma", "timer alarm");
    ESP_RETURN_ON_ERROR(gptimer_start(s_timer), "dma", "timer start");
    if (xSemaphoreTake(s_start_sem, pdMS_TO_TICKS(5)) != pdTRUE) return ESP_ERR_TIMEOUT;
    gptimer_stop(s_timer);

    dds_oscillator_t osc{};
    dds_configure(&osc, plan.frequency_hz, plan.sample_rate_hz);
    uint32_t sent = 0;
    uint32_t block = 0;
    while (sent < plan.sample_count) {
        const uint32_t count = (plan.sample_count - sent) > DMA_SAMPLES
            ? DMA_SAMPLES : (plan.sample_count - sent);
        fill_block(s_buffers[block], sent, count, plan.sample_count, &osc, plan.window, plan.amplitude_q15);
        ESP_RETURN_ON_ERROR(esp_lcd_panel_io_tx_color(s_io, 0, s_buffers[block], count), "dma", "submit");
        if (xSemaphoreTake(s_done_sem, pdMS_TO_TICKS(10)) != pdTRUE) return ESP_ERR_TIMEOUT;
        sent += count;
        block ^= 1U;
    }
    return ESP_OK;
}
