#pragma once
#include <stdint.h>
#include "esp_err.h"
#include "solver.h"

enum class firmware_state_t : uint8_t { BOOT = 0, READY = 1, ARMED = 2, TRANSMITTING = 3, MISSION = 4, FAULT = 5 };
enum class link_opcode_t : uint8_t { PING_NOW = 1, SET_MODE = 2, MISSION_ARM = 3, MISSION_DISARM = 4, GET_STATUS = 5, SET_INTERVAL = 6 };
struct link_command_t { link_opcode_t opcode; uint32_t sequence; uint32_t arg0; uint32_t arg1; };
struct telemetry_data_t {
    uint32_t sequence, uptime_ms;
    firmware_state_t state;
    sonar_mode_t mode;
    window_type_t window;
    uint8_t flags;
    uint32_t frequency_hz, sample_rate_hz;
    int16_t temperature_centi_c;
    uint16_t tds_mg_l, turbidity_ntu_x10, battery_mv, current_ma_x10;
    uint32_t energy_uj;
    uint16_t cpu_idle_permille, adaptation_ms;
    uint32_t fault_bits;
};

esp_err_t link_init();
bool link_poll_command(link_command_t *out);
void link_publish_telemetry(const telemetry_data_t &data);
void link_set_radio_enabled(bool enabled);
