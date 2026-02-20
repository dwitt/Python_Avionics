/*****************************************************************************
 * MS4525DO.h
 *****************************************************************************/

#ifndef __MS4525DO_H__
#define __MS4525DO_H__

#include "Arduino.h"
#include <Adafruit_I2CDevice.h>
#include <Adafruit_Sensor.h>
#include <Wire.h>

#define MS4525DO_ADDRESS (0x28)     // Default I2C address for MS4525DO

class MS4525DO;

// ----------------------------------------------------------------------------
// Unified Sensor interface for the temperature component of MS4525DO

class MS4525DO_Temp : public Adafruit_Sensor {
public:
    // ------------------------------------------------------------------------
    // @brief Create an Adafruit_Sensor compatible object for the temperature 
    // sensor
    // @param parent the MS4525DO object to use

    MS4525DO_Temp(MS4525DO *parent) {_theMS4525DO = parent;};
    bool getEvent(sensors_event_t *event);
    void getSensor(sensor_t *sensor);
private:
    int _sensorID = 0x20;  // 32
    MS4525DO *_theMS4525DO = NULL;
};  

// ----------------------------------------------------------------------------
// Unified Sensor interface for the pressure component of MS4525DO

class MS4525DO_Pressure : public Adafruit_Sensor {
public:
    // ------------------------------------------------------------------------
    // @brief Create an Adafruit_Sensor compatible object for the pressure 
    // sensor
    // @param parent the MS4525DO object to use

    MS4525DO_Pressure(MS4525DO *parent) {_theMS4525DO = parent;};
    bool getEvent(sensors_event_t *event);
    void getSensor(sensor_t *sensor);
private:
    int _sensorID = 0x20;  // 32
    MS4525DO *_theMS4525DO = NULL;
};

// ----------------------------------------------------------------------------
// MS4525DO class
// This class is a wrapper for the MS4525DO sensor
// It provides a unified interface for the temperature and pressure sensors
// It also provides a unified interface for the pressure range and output type

class MS4525DO {
public:
    // ------------------------------------------------------------------------
    // Pressure Accuracy

    enum MS4525D_Output_Type {
        MS4525DO_Type_A,
        MS4525DO_Type_B
    };

    // ------------------------------------------------------------------------
    // Pressure Range of sensor
    // For a Differential Pressure sensor Pmin = -Prange and Pmax = +Prange

    enum MS4525DO_Pressure_Range {
        MS4525DO_001 = 1,
        MS4525DO_002 = 2,
        MS4525DO_005 = 5,
        MS4525DO_015 = 15,
        MS4525DO_030 = 30,
        MS4525DO_050 = 50,
        MS4525DO_100 = 100,
        MS4525DO_150 = 150 
    };

    // Constructor
    MS4525DO();
    bool init();

    // Set the pressure range
    void setPressureRange(MS4525DO_Pressure_Range range);
    void setOutputType(MS4525D_Output_Type type);

    void zeroPressureSensor();
    
    // Initialization
    bool begin(uint8_t addr = MS4525DO_ADDRESS, TwoWire *theWire = &Wire);

    // Core Sensor Methods
    float readPressure();
    float readTemperature();
    float readSpeed();
    uint16_t readRawPressureCount();

    Adafruit_Sensor *getTemperatureSensor(void);
    Adafruit_Sensor *getPressureSensor(void);
    int16_t _pZeroCountOffset = 0;

protected: 
    Adafruit_I2CDevice *i2c_dev = NULL; ///< Pointer to I2C bus interface
    // ------------------------------------------------------------------------
    // Friend classes
    // These classes need access to the private variables of MS4525DO
    // to get the sensor ID and the pressure range

    friend class MS4525DO_Temp;
    friend class MS4525DO_Pressure;

    MS4525DO_Temp *tempSensor = NULL;
    MS4525DO_Pressure *pressureSensor = NULL;

private:
    // I2C communication methods
    void readData(uint8_t *buffer, uint8_t len);
    uint8_t readByte();
    uint16_t readWord();
    uint32_t readLong();
    
    // Private variables
    TwoWire *_wire;
    uint8_t _i2c_addr;
    int32_t _sensorID;
    MS4525DO_Pressure_Range _pressureRange;
    MS4525D_Output_Type _outputType;
   
    float _pMin;
    float _pMax;
    float _pRange;
    int16_t _pMinCount;
    int16_t _pMaxCount;   

};




#endif