/*****************************************************************************
 * SSC.h
 *****************************************************************************/

#ifndef __SSC_H__
#define __SSC_H__

#include "Arduino.h"
#include <Adafruit_I2CDevice.h>
#include <Adafruit_Sensor.h>
#include <Wire.h>

#define SSC_ADDRESS (0x78)     // Default I2C address for SSC
#define SSC_SENSOR_ID (0x21)  // 33 decimal

class SSC;

// ----------------------------------------------------------------------------
// Unified Sensor interface for the temperature component of MS4525DO

class SSC_Temp : public Adafruit_Sensor {
public:
    // ------------------------------------------------------------------------
    // @brief Create an Adafruit_Sensor compatible object for the temperature 
    // sensor
    // @param parent the MS4525DO object to use

    SSC_Temp(SSC *parent) {_theSSC = parent;};
    bool getEvent(sensors_event_t *event);
    void getSensor(sensor_t *sensor);
private:
    int _sensorID;
    SSC *_theSSC = NULL;
};  

// ----------------------------------------------------------------------------
// Unified Sensor interface for the pressure component of MS4525DO

class SSC_Pressure : public Adafruit_Sensor {
public:
    // ------------------------------------------------------------------------
    // @brief Create an Adafruit_Sensor compatible object for the pressure 
    // sensor
    // @param parent the MS4525DO object to use

    SSC_Pressure(SSC *parent) {_theSSC = parent;};
    bool getEvent(sensors_event_t *event);
    void getSensor(sensor_t *sensor);
private:
    int _sensorID = 0x21;  // 33
    SSC *_theSSC = NULL;
};

// ----------------------------------------------------------------------------
// SSC class
// This class is a wrapper for the SSC sensor
// It provides a unified interface for the temperature and pressure sensors
// It also provides a unified interface for the pressure range and output type

class SSC {
public:
    // ------------------------------------------------------------------------
    // Transfer Function - Accuracy

    enum SSC_Transfer_Function {
        SSC_TF_A,  // 10% to 90%  ***
        SSC_TF_B,  // 5% to 95%
        SSC_TF_C,  // 5% to 85%
        SSC_TF_F   // 4% to 94%

    };

    // ------------------------------------------------------------------------
    // Pressure Range of sensor
    // in 100 millibars

    enum SSC_Pressure_Range {
        SSC_001BA = 10,  // 1.0 bar (100.0 kPa or 1000 hPa)
        SSC_016BA = 16,  // 1.6 bar (160.0 kPa or 1600 hPa) ***
        SSC_025BA = 25,  // 2.5 bar (250.0 kPa or 2500 hPa)
        SSC_004BA = 40,  // 4.0 bar (400.0 kPa or 4000 hPa)
        SSC_006BA = 60,  // 6.0 bar (600.0 kPa or 6000 hPa)
        SSC_010BA = 100  // 10.0 bar (1000.0 kPa or 10000 hPa)
    };

    // Constructor
    SSC();
    bool init();

    // Set the pressure range
    void setPressureRange(SSC_Pressure_Range range);
    void setTransferFunction(SSC_Transfer_Function type);

    //void zeroPressureSensor();
    
    // Initialization
    bool begin(uint8_t addr = SSC_ADDRESS, TwoWire *theWire = &Wire);

    // Core Sensor Methods
    float readPressure();
    float readTemperature();
    float readAltitude(float seaLevelPressure_hPa = 1013.25);
    uint16_t readRawPressureCount();

    Adafruit_Sensor *getTemperatureSensor(void);
    Adafruit_Sensor *getPressureSensor(void);
    
    int16_t _pZeroCountOffset = 0;

    // Consider moving these to the private variables
    float _pMin;
    float _pMax;
    float _pRange;
    int16_t _pMinCount;
    int16_t _pMaxCount;  

protected: 
    Adafruit_I2CDevice *i2c_dev = NULL; ///< Pointer to I2C bus interface
    // ------------------------------------------------------------------------
    // Friend classes
    // These classes need access to the private variables of MS4525DO
    // to get the sensor ID and the pressure range

    friend class SSC_Temp;
    friend class SSC_Pressure;

    SSC_Temp *tempSensor = NULL;
    SSC_Pressure *pressureSensor = NULL;

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
    SSC_Pressure_Range _pressureRange;
    SSC_Transfer_Function _transferFunction;
   
 

};




#endif