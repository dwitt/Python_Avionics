/*****************************************************************************
 * This is a library for the SSC pressure sensor.
 * 
 * This sensor library uses I2C to communicate.
 * Two pins are required to interface to the sensor.
 * 
 * Written by David Witt
 *****************************************************************************/

#include "SSC.h"

/*****************************************************************************
 * Constructor
 *****************************************************************************/

SSC::SSC()  {
    _wire = &Wire;                      // Use the default I2C interface
    _i2c_addr = SSC_ADDRESS;            // Use the default I2C address
    _sensorID = SSC_SENSOR_ID;          // Set the sensor ID
}

/*****************************************************************************
 * @brief Initialize the sensor
 * 
 * This function initializes the I2C communication with the sensor.
 * It then calls the init() function to initialize the sensor.
 * @param addr the I2C address of the sensor
 * @param theWire the I2C interface to use
 * @returns true on success, false on failure
 *****************************************************************************/

bool SSC::begin(uint8_t addr, TwoWire *theWire) {
    // Delete the I2C device if it exists
    if (i2c_dev) {
        delete i2c_dev;
        i2c_dev = NULL;
    }

    // Create a new I2C device
    i2c_dev = new Adafruit_I2CDevice(addr, theWire);
    if (!i2c_dev->begin()) {
        return false;
    }

    // Initialize the sensor
    return init();
}

// ----------------------------------------------------------------------------
// @brief Initialize the sensor with given parameters / settings
// @returns true on success, false on failure
// ----------------------------------------------------------------------------

bool SSC::init() {
    uint16_t value = 0;
    value = readWord() & 0x3FFF;

    // Set some sane default values
    setPressureRange(SSC_016BA);    // 1.6 bar (160.0 kPa or 1600 hPa)
    setTransferFunction(SSC_TF_A);  // 10% to 90%
 
    return true;
}

// ----------------------------------------------------------------------------
// @brief Read one byte from the sensor
// @returns the byte value or 0 on failure
// ----------------------------------------------------------------------------

uint8_t SSC::readByte() {
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
uint16_t SSC::readWord() {
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

uint32_t SSC::readLong() {
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

void SSC::readData(uint8_t *buffer, uint8_t len) {
    i2c_dev->read(buffer, len);
}

// ----------------------------------------------------------------------------
// @brief Read the pressure count from the sensor
// @returns the pressure count or 0 on failure
// ----------------------------------------------------------------------------

uint16_t SSC::readRawPressureCount() {
    uint16_t raw_data = readWord();
    uint8_t status = (raw_data & 0xC000) >> 14;
    if (status != 0b00) {
        return 0;   // Status not normal
    }
    return raw_data & 0x3FFF;
}

// ----------------------------------------------------------------------------
// @brief Read the pressure from the sensor
// @returns the pressure value in hPa or 0 on failure
// ----------------------------------------------------------------------------

float SSC::readPressure() {
    uint16_t raw_data = readWord();
    uint8_t status = (raw_data & 0xC000) >> 14;
    int16_t pressure_count = (raw_data & 0x3FFF);
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

float SSC::readTemperature() {
    uint32_t raw_data = readLong();
    uint8_t status = (raw_data & 0xC0000000) >> 30;
    uint16_t temperature_count = (raw_data & 0x0000FFE0) >> 5;
    float temperature_value = 0;

    if (status != 0b00 && status != 0b10) {
        return 0;   // Status not normal and not stale
    }

    // Status normal or stale
    temperature_value = temperature_count * 200.0 / 2047.0 - 50.0;

    return (temperature_value);
}

// ----------------------------------------------------------------------------
// @brief Read the altitude from the sensor
// @returns the altitude in feet
// ----------------------------------------------------------------------------

float SSC::readAltitude(float seaLevelPressure_hPa) {  
  float pressure_hPa = readPressure();
  // Convert pressure in hPa to altitude in feet
  // seaLevelPressure_hPa is the pressure at sea level (standard is 1013.25 hPa)
  float altitude_m = 44330.0 * (1.0 - pow(pressure_hPa / seaLevelPressure_hPa, 0.1903));
  return altitude_m * 3.28084; // convert meters to feet
}

// ----------------------------------------------------------------------------
// @brief Set the pressure range in hPa. Converts from  to hPa
// @param range the pressure range to set
// @returns true on success, false on failure
// ----------------------------------------------------------------------------
void SSC::setPressureRange(SSC_Pressure_Range range) {

    _pMin = 0;
    _pMax = range * 100.0;
    _pRange = _pMax - _pMin;
}

// ----------------------------------------------------------------------------
// @brief Set the output type
// @param type the output type to set
// @returns true on success, false on failure
// ----------------------------------------------------------------------------

void SSC::setTransferFunction(SSC_Transfer_Function type) {
    _transferFunction = type;

    switch (type) {
        case SSC_TF_A:
            _pMinCount = 0x0666; // 10% x 0x4000 counts
            _pMaxCount = 0x399A; // 90% x 0x4000 counts
            break;
        case SSC_TF_B:
            _pMinCount = 0x0333; // 5% x 0x4000 counts
            _pMaxCount = 0x3CCD; // 95% x 0x4000 counts
            break;
        case SSC_TF_C:
            _pMinCount = 0x0333; // 5% x 0x4000 counts
            _pMaxCount = 0x3666; // 85% x 0x4000 counts
            break;
        case SSC_TF_F:
            _pMinCount = 0x028F; // 4% x 0x4000 counts
            _pMaxCount = 0x3C28; // 94% x 0x4000 counts
            break;
    }

}

// ----------------------------------------------------------------------------
// @brief Get the temperature sensor
// @returns the temperature sensor
// ----------------------------------------------------------------------------

Adafruit_Sensor *SSC::getTemperatureSensor(void) {
    if (!tempSensor) {
        tempSensor = new SSC_Temp(this);
    }
    return tempSensor;
}

// ----------------------------------------------------------------------------
// @brief Get the pressure sensor
// @returns the pressure sensor
// ----------------------------------------------------------------------------

Adafruit_Sensor *SSC::getPressureSensor(void) {
    if (!pressureSensor) {
        pressureSensor = new SSC_Pressure(this);
    }
    return pressureSensor;
}

// ----------------------------------------------------------------------------
// @brief Gets the sensor_t struct for the SSC's temperature sensor
// @param sensor the sensor_t struct to fill
// ----------------------------------------------------------------------------

void SSC_Temp::getSensor(sensor_t *sensor) {
    // Clear the sensor_t structure
    memset(sensor, 0, sizeof(sensor_t));

    // Set the sensor name
    strncpy(sensor->name, "SSC", sizeof(sensor->name) - 1);
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
// @brief Gets the event from the SSC's temperature sensor
// @param event the event to get
// @returns true on success, false on failure
// ----------------------------------------------------------------------------

bool SSC_Temp::getEvent(sensors_event_t *event) {
    // Clear the event structure
    memset(event, 0, sizeof(sensors_event_t));

    // Set the event type
    event->version = sizeof(sensors_event_t);
    event->sensor_id = _sensorID;
    event->type = SENSOR_TYPE_AMBIENT_TEMPERATURE;
    event->timestamp = millis();
    event->temperature = _theSSC->readTemperature();
    return true;
}

// ----------------------------------------------------------------------------
// @brief Gets the sensor_t struct for the SSC's pressure sensor
// @param sensor the sensor_t struct to fill
// ----------------------------------------------------------------------------

void SSC_Pressure::getSensor(sensor_t *sensor) {   
    // Clear the sensor_t structure
    memset(sensor, 0, sizeof(sensor_t));

    // Set the sensor name
    strncpy(sensor->name, "SSC", sizeof(sensor->name) - 1);
    sensor->name[sizeof(sensor->name) - 1] = 0;
    sensor->version = 1;
    sensor->sensor_id = _sensorID;
    sensor->type = SENSOR_TYPE_PRESSURE;    
    sensor->min_value = _theSSC->_pMin;
    sensor->max_value = _theSSC->_pMax;
    sensor->resolution = _theSSC->_pRange / 
    (_theSSC->_pMaxCount - _theSSC->_pMinCount);
    sensor->min_delay = 500;
}

// ----------------------------------------------------------------------------
// @brief Gets the event from the SSC's pressure sensor
// @param event the event to get
// @returns true on success, false on failure
// ----------------------------------------------------------------------------

bool SSC_Pressure::getEvent(sensors_event_t *event) {
    // Clear the event structure
    memset(event, 0, sizeof(sensors_event_t));

    // Set the event type
    event->version = sizeof(sensors_event_t);
    event->sensor_id = _sensorID;
    event->type = SENSOR_TYPE_PRESSURE;
    event->timestamp = millis();
    event->pressure = _theSSC->readPressure(); 
    return true;
}