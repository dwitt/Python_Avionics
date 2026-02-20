/*****************************************************************************
 * This is a library for the MS4525DO pressure sensor.
 * 
 * This sensor library uses I2C to communicate.
 * Two pins are required to interface to the sensor.
 * 
 * Written by David Witt
 *****************************************************************************/

#include "MS4525DO.h"

/*****************************************************************************
 * Constructor
 *****************************************************************************/

MS4525DO::MS4525DO()  {
    _wire = &Wire;                      // Use the default I2C interface
    _i2c_addr = MS4525DO_ADDRESS;    // Use the default I2C address
    //_sensorID = sensorID;               // Set the sensor ID
}

/*****************************************************************************
 * Required Adafruit_Sensor interface
 *****************************************************************************/

bool MS4525DO::begin(uint8_t addr, TwoWire *theWire) {
    if (i2c_dev) {
        delete i2c_dev;
        i2c_dev = NULL;
    }

    i2c_dev = new Adafruit_I2CDevice(addr, theWire);
    if (!i2c_dev->begin()) {
        return false;
    }

    return init();
}

// ----------------------------------------------------------------------------
// @brief Initialize the sensor with given parameters / settings
// @returns true on success, false on failure
// ----------------------------------------------------------------------------

bool MS4525DO::init() {
    uint8_t value = 0;
    value = readByte() & 0x3F;
    if (value == 0x00) {
        return false; // Sensor not found
    }
    // expect a value of 0x1F or 0x20
    if (value != 0x1F && value != 0x20) {
        return false; // Sensor not found
    }
    _sensorID = 0x20;

    // set some sane default values
    setPressureRange(MS4525DO_001);
    setOutputType(MS4525DO_Type_A);
    zeroPressureSensor();

    return true;
}

// ----------------------------------------------------------------------------
// @brief Read one byte from the sensor
// @returns the byte value or 0 on failure
// ----------------------------------------------------------------------------

uint8_t MS4525DO::readByte() {
    uint8_t value = 0;

    if (i2c_dev->read(&value, 1)) {
        return value;
    }
    return 0;
}

// ----------------------------------------------------------------------------
// @brief Read one word from the sensor
// @returns the word value or 0 on failure
// ----------------------------------------------------------------------------
uint16_t MS4525DO::readWord() {
    uint8_t buffer[2] = {0};

    if (i2c_dev->read(buffer, 2)) {
        return (buffer[0] << 8) | buffer[1];
    }
    return 0;
}   

// ----------------------------------------------------------------------------
// @brief Read one long from the sensor
// @returns the long value or 0 on failure
// ----------------------------------------------------------------------------

uint32_t MS4525DO::readLong() {
    uint8_t buffer[4] = {0};

    if (i2c_dev->read(buffer, 4)) {
        return (buffer[0] << 24) | (buffer[1] << 16) | (buffer[2] << 8) | buffer[3];
    }
    return 0;
}

// ----------------------------------------------------------------------------
// @brief Read the data from the sensor
// @param buffer the buffer to read the data into
// @param len the length of the data to read
// ----------------------------------------------------------------------------

void MS4525DO::readData(uint8_t *buffer, uint8_t len) {
    i2c_dev->read(buffer, len);
}

// ----------------------------------------------------------------------------
// @brief Read the pressure count from the sensor
// @returns the pressure count or 0 on failure
// ----------------------------------------------------------------------------

uint16_t MS4525DO::readRawPressureCount() {
    uint16_t raw_data = readWord();
    uint8_t status = (raw_data & 0xC000) >> 14;
    if (status != 0b00) {
        return 0;   // Status not normal
    }
    return raw_data & 0x3FFF;
}

// ----------------------------------------------------------------------------
float MS4525DO::readPressure() {
    uint16_t raw_data = readWord();
    uint8_t status = (raw_data & 0xC000) >> 14;
    int16_t pressure_count = (raw_data & 0x3FFF) + _pZeroCountOffset;
    float pressure_value = 0;

    if (status != 0b00 && status != 0b10) {
        return 0;   // Status not normal and not stale
    }

    // Status normal or stale
    pressure_value = _pRange * ((float)(pressure_count - _pMinCount) /
                    (float)(_pMaxCount - _pMinCount)) + _pMin;

    return (pressure_value);
}

// ----------------------------------------------------------------------------
// @brief Read the temperature from the sensor
// @returns the temperature value or 0 on failure
// ----------------------------------------------------------------------------

float MS4525DO::readTemperature() {
    uint32_t raw_data = readLong();
    uint8_t status = (raw_data & 0xC0000000) >> 30;
    uint16_t temperature_count = (raw_data & 0x0000FFE0) >> 5;
    float temperature_value = 0;

    if (status != 0b00 && status != 0b10) {
        return 0;   // Status not normal and not stale
    }

    // Status normal or stale
    temperature_value = temperature_count * 200.0 / 2048.0 - 50.0;

    return (temperature_value);
}

// ----------------------------------------------------------------------------
// @brief Read the speed from the sensor
// @returns the speed in knots
// ----------------------------------------------------------------------------

float MS4525DO::readSpeed() {  
    // Constants
    const float rho = 1.225;         // Air density at sea level in kg/m^3
    const float hPa_to_Pa = 100.0;   // Conversion from hPa to Pascals
    const float mps_to_knots = 1.94384; // Conversion from m/s to knots

    // Convert hPa to Pascals
    float pressure_hPa = readPressure();
    if (pressure_hPa <= 0) pressure_hPa = 0.0;
    float deltaP_Pa = pressure_hPa * hPa_to_Pa;

    // Use Bernoulli’s equation: V = sqrt(2 * P / rho)
    float velocity_mps = sqrt((2.0 * deltaP_Pa) / rho);
    float speed = velocity_mps * mps_to_knots;
    return speed;
}

// ----------------------------------------------------------------------------
// @brief Set the pressure range in hPa. Converts from psi to hPa
// @param range the pressure range to set
// @returns true on success, false on failure
// ----------------------------------------------------------------------------
void MS4525DO::setPressureRange(MS4525DO_Pressure_Range range) {

    _pMin = -range * 68.9476;
    _pMax = range * 68.9476;
    _pRange = _pMax - _pMin;
}

// ----------------------------------------------------------------------------
// @brief Set the output type
// @param type the output type to set
// @returns true on success, false on failure
// ----------------------------------------------------------------------------

void MS4525DO::setOutputType(MS4525D_Output_Type type) {
    _outputType = type;

    if (type == MS4525DO_Type_A) {
        _pMinCount = 0x0666; // 10% x 0x3FFF
        _pMaxCount = 0x3998; // 90% x 0x3FFF
    } else {
        _pMinCount = 0x0333; // 5% x 0x3FFF
        _pMaxCount = 0x3CCB; // 95% x 0x3FFF
    }
}

// ----------------------------------------------------------------------------
// @brief Calculate the offset to zero the sensor
// @returns true on success, false on failure
// ----------------------------------------------------------------------------

void MS4525DO::zeroPressureSensor() {
    int32_t pZeroCount = 0;
    int16_t pCount = 0;
    for(int i = 0; i < 10; i++) {
        while (pCount == 0) {
            pCount = readRawPressureCount();
        }
        pZeroCount += pCount;
    }
    pZeroCount /= 10;
    _pZeroCountOffset = 0x2000 - pZeroCount;
}

// ----------------------------------------------------------------------------
// @brief Get the temperature sensor
// @returns the temperature sensor
// ----------------------------------------------------------------------------

Adafruit_Sensor *MS4525DO::getTemperatureSensor(void) {
    if (!tempSensor) {
        tempSensor = new MS4525DO_Temp(this);
    }
    return tempSensor;
}

// ----------------------------------------------------------------------------
// @brief Get the pressure sensor
// @returns the pressure sensor
// ----------------------------------------------------------------------------

Adafruit_Sensor *MS4525DO::getPressureSensor(void) {
    if (!pressureSensor) {
        pressureSensor = new MS4525DO_Pressure(this);
    }
    return pressureSensor;
}

// ----------------------------------------------------------------------------
// @brief Gets the sensor_t struct for the MS4525DO's temperature sensor
// @param sensor the sensor_t struct to fill
// ----------------------------------------------------------------------------

void MS4525DO_Temp::getSensor(sensor_t *sensor) {
    // Clear the sensor_t structure
    memset(sensor, 0, sizeof(sensor_t));

    // Set the sensor name
    strncpy(sensor->name, "MS4525DO", sizeof(sensor->name) - 1);
    sensor->name[sizeof(sensor->name) - 1] = 0;
    sensor->version = 1;
    sensor->sensor_id = _sensorID;
    sensor->type = SENSOR_TYPE_AMBIENT_TEMPERATURE;
    sensor->min_value = -50.0;
    sensor->max_value = 150.0;
    sensor->resolution = 0.1;
    sensor->min_delay = 500;
}

// ----------------------------------------------------------------------------
// @brief Gets the event from the MS4525DO's temperature sensor
// @param event the event to get
// @returns true on success, false on failure
// ----------------------------------------------------------------------------

bool MS4525DO_Temp::getEvent(sensors_event_t *event) {
    // Clear the event structure
    memset(event, 0, sizeof(sensors_event_t));

    // Set the event type
    event->version = sizeof(sensors_event_t);
    event->sensor_id = _sensorID;
    event->type = SENSOR_TYPE_AMBIENT_TEMPERATURE;
    event->timestamp = millis();
    event->temperature = _theMS4525DO->readTemperature();
    return true;
}

// ----------------------------------------------------------------------------
// @brief Gets the sensor_t struct for the MS4525DO's pressure sensor
// @param sensor the sensor_t struct to fill
// ----------------------------------------------------------------------------

void MS4525DO_Pressure::getSensor(sensor_t *sensor) {   
    // Clear the sensor_t structure
    memset(sensor, 0, sizeof(sensor_t));

    // Set the sensor name
    strncpy(sensor->name, "MS4525DO", sizeof(sensor->name) - 1);
    sensor->name[sizeof(sensor->name) - 1] = 0;
    sensor->version = 1;
    sensor->sensor_id = _sensorID;
    sensor->type = SENSOR_TYPE_PRESSURE;    
    sensor->min_value = _theMS4525DO->_pMin;
    sensor->max_value = _theMS4525DO->_pMax;
    sensor->resolution = _theMS4525DO->_pRange / 
    (_theMS4525DO->_pMaxCount - _theMS4525DO->_pMinCount);
    sensor->min_delay = 500;
}

// ----------------------------------------------------------------------------
// @brief Gets the event from the MS4525DO's pressure sensor
// @param event the event to get
// @returns true on success, false on failure
// ----------------------------------------------------------------------------

bool MS4525DO_Pressure::getEvent(sensors_event_t *event) {
    // Clear the event structure
    memset(event, 0, sizeof(sensors_event_t));

    // Set the event type
    event->version = sizeof(sensors_event_t);
    event->sensor_id = _sensorID;
    event->type = SENSOR_TYPE_PRESSURE;
    event->timestamp = millis();
    event->pressure = _theMS4525DO->readPressure(); 
    return true;
}