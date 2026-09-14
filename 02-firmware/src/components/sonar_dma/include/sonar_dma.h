#pragma once
#include "esp_err.h"
#include "solver.h"
esp_err_t sonar_dma_init();
esp_err_t sonar_dma_transmit(const solver_plan_t &plan, uint32_t start_delay_us);
