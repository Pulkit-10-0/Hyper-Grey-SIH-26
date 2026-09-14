#include <inttypes.h>
#include <string.h>

#include "esp_check.h"
#include "esp_freertos_hooks.h"
#include "esp_log.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/task.h"
#include "nvs_flash.h"

#include "adc_sensors.h"
#include "board.h"
#include "dds.h"
#include "hmi.h"
#include "link.h"
#include "physics.h"
#include "power.h"
#include "solver.h"
#include "sonar_dma.h"

namespace {
constexpr char TAG[] = "seanergy";
constexpr uint32_t CONTROL_PERIOD_MS = 20;        // Control-loop period in milliseconds.
constexpr uint32_t SENSOR_PERIOD_MS = 1000;       // Environmental sample period in milliseconds.
constexpr uint32_t DEFAULT_MISSION_PING_PERIOD_MS = 1000; // Autonomous mission ping interval.
constexpr uint32_t TX_START_DELAY_US = 50;        // Hardware-timer delay before DMA begins.
constexpr uint32_t MISSION_MAGIC_WORD = 0x534E5247U; // ASCII "SNRG".

QueueHandle_t s_ping_queue;
portMUX_TYPE s_snapshot_lock = portMUX_INITIALIZER_UNLOCKED;
sensor_snapshot_t s_snapshot{};
solver_plan_t s_latest_plan{};
volatile firmware_state_t s_state = firmware_state_t::BOOT;
volatile bool s_mission_mode = false;
uint32_t s_sequence = 0;
uint32_t s_mission_ping_period_ms = DEFAULT_MISSION_PING_PERIOD_MS;

void copy_snapshot(sensor_snapshot_t *out) {
    portENTER_CRITICAL(&s_snapshot_lock);
    *out = s_snapshot;
    portEXIT_CRITICAL(&s_snapshot_lock);
}

bool IRAM_ATTR core0_idle_hook() {
    board_toggle_idle_marker();
    return true;
}

void sensor_task(void *) {
    TickType_t wake = xTaskGetTickCount();
    while (true) {
        sensor_snapshot_t next{};
        if (sensors_read(&next) == ESP_OK) {
            portENTER_CRITICAL(&s_snapshot_lock);
            s_snapshot = next;
            portEXIT_CRITICAL(&s_snapshot_lock);
        }
        power_sample();
        vTaskDelayUntil(&wake, pdMS_TO_TICKS(SENSOR_PERIOD_MS));
    }
}

void submit_ping(const solver_plan_t &plan) {
    if (uxQueueSpacesAvailable(s_ping_queue) > 0) {
        xQueueSend(s_ping_queue, &plan, 0);
    }
}

void handle_command(const link_command_t &cmd, solver_plan_t *plan) {
    switch (cmd.opcode) {
        case link_opcode_t::PING_NOW:
            submit_ping(*plan);
            break;
        case link_opcode_t::SET_MODE:
            solver_force_mode(static_cast<sonar_mode_t>(cmd.arg0 & 0x03U));
            break;
        case link_opcode_t::MISSION_ARM:
            if (cmd.arg0 == MISSION_MAGIC_WORD) {
                if (cmd.arg1 >= 100U && cmd.arg1 <= 60000U) s_mission_ping_period_ms = cmd.arg1;
                s_mission_mode = true;
                s_state = firmware_state_t::MISSION;
                link_set_radio_enabled(false);
            }
            break;
        case link_opcode_t::MISSION_DISARM:
            s_mission_mode = false;
            s_state = firmware_state_t::READY;
            break;
        case link_opcode_t::SET_INTERVAL:
            if (cmd.arg0 >= 100U && cmd.arg0 <= 60000U) s_mission_ping_period_ms = cmd.arg0;
            break;
        case link_opcode_t::GET_STATUS:
        default:
            break;
    }
}

void control_task(void *) {
    uint64_t last_mission_ping_ms = 0;
    s_state = firmware_state_t::READY;
    while (true) {
        sensor_snapshot_t sample{};
        copy_snapshot(&sample);
        solver_plan_t next{};
        solver_update(sample, power_battery_mv(), &next);
        s_latest_plan = next;

        link_command_t cmd{};
        while (link_poll_command(&cmd)) {
            handle_command(cmd, &next);
        }

        if (hmi_trigger_pressed()) {
            if (s_mission_mode) {
                s_mission_mode = false;
                link_set_radio_enabled(true);
                s_state = firmware_state_t::READY;
            } else {
                submit_ping(next);
            }
        }

        const uint64_t now_ms = esp_timer_get_time() / 1000ULL;
        if (s_mission_mode && now_ms - last_mission_ping_ms >= s_mission_ping_period_ms) {
            submit_ping(next);
            last_mission_ping_ms = now_ms;
        }

        hmi_update(s_state, next.frequency_hz, power_battery_mv(), next.margin_db_x10);
        vTaskDelay(pdMS_TO_TICKS(CONTROL_PERIOD_MS));
    }
}

void tx_task(void *) {
    solver_plan_t plan{};
    while (xQueueReceive(s_ping_queue, &plan, portMAX_DELAY) == pdTRUE) {
        s_state = firmware_state_t::ARMED;
        board_set_tx_enabled(true);
        board_set_envelope_marker(true);
        power_begin_ping();

        s_state = firmware_state_t::TRANSMITTING;
        const esp_err_t tx_result = sonar_dma_transmit(plan, TX_START_DELAY_US);

        const uint32_t energy_uj = power_end_ping();
        board_set_envelope_marker(false);
        board_set_tx_enabled(false);
        s_state = tx_result == ESP_OK
            ? (s_mission_mode ? firmware_state_t::MISSION : firmware_state_t::READY)
            : firmware_state_t::FAULT;

        sensor_snapshot_t sample{};
        copy_snapshot(&sample);
        telemetry_data_t telemetry{};
        telemetry.sequence = ++s_sequence;
        telemetry.uptime_ms = static_cast<uint32_t>(esp_timer_get_time() / 1000ULL);
        telemetry.state = s_state;
        telemetry.mode = plan.mode;
        telemetry.window = plan.window;
        telemetry.flags = s_mission_mode ? 0x01U : 0x00U;
        telemetry.frequency_hz = plan.frequency_hz;
        telemetry.sample_rate_hz = plan.sample_rate_hz;
        telemetry.temperature_centi_c = sample.temperature_centi_c;
        telemetry.tds_mg_l = sample.tds_mg_l;
        telemetry.turbidity_ntu_x10 = sample.turbidity_ntu_x10;
        telemetry.battery_mv = power_battery_mv();
        telemetry.current_ma_x10 = power_current_ma_x10();
        telemetry.energy_uj = energy_uj;
        telemetry.cpu_idle_permille = 0xFFFFU; // External scope is authoritative.
        telemetry.adaptation_ms = solver_last_latency_ms();
        telemetry.fault_bits = tx_result == ESP_OK ? 0U : 0x00000001U;
        link_publish_telemetry(telemetry);
    }
}
} // namespace

extern "C" void app_main(void) {
    ESP_ERROR_CHECK(nvs_flash_init());
    ESP_ERROR_CHECK(board_init());
    ESP_ERROR_CHECK(sensors_init());
    ESP_ERROR_CHECK(power_init());
    power_sample();
    ESP_ERROR_CHECK(hmi_init());
    ESP_ERROR_CHECK(link_init());
    ESP_ERROR_CHECK(sonar_dma_init());
    solver_init();

    ESP_ERROR_CHECK(esp_register_freertos_idle_hook_for_cpu(core0_idle_hook, 0));
    s_ping_queue = xQueueCreate(2, sizeof(solver_plan_t));
    ESP_ERROR_CHECK(s_ping_queue ? ESP_OK : ESP_ERR_NO_MEM);

    xTaskCreatePinnedToCore(tx_task, "tx", 4096, nullptr, 20, nullptr, 0);
    xTaskCreatePinnedToCore(sensor_task, "sensors", 4096, nullptr, 5, nullptr, 1);
    xTaskCreatePinnedToCore(control_task, "control", 6144, nullptr, 8, nullptr, 1);
    ESP_LOGI(TAG, "SeaNergy payload ready; mission guard 0x%08" PRIX32, MISSION_MAGIC_WORD);
}
