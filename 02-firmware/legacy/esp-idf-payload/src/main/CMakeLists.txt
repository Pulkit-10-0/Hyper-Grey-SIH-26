idf_component_register(
    SRCS "main.cpp"
    INCLUDE_DIRS "."
    REQUIRES board dds window sonar_dma sensors physics solver link hmi power
             freertos nvs_flash esp_timer
)
