#ifndef __SENSOR_CALIBRATION_EEPROM__
#define __SENSOR_CALIBRATION_EEPROM__

#include "Sensor_Calibration.h"
#include <Adafruit_EEPROM_I2C.h>

#define EEPROM_CAL_SIZE 68

/**!  @brief Class for managing storing calibration in internal EEPROM memory
 * **/
class Sensor_Calibration_EEPROM : public Sensor_Calibration {
public:
  // Constructor
  Sensor_Calibration_EEPROM(uint8_t i2c_addr = 0x50, TwoWire *the_wire = &Wire); // 

  bool begin(uint8_t eeprom_addr); // 

  bool saveCalibration(void);
  bool loadCalibration(void);
  bool printSavedCalibration(void);

private:
  uint16_t ee_addr = 0;
  uint8_t eeprom_i2c_address = 0x50;
  TwoWire *eeprom_wire = &Wire;
  static Adafruit_EEPROM_I2C EEPROM;
};

#endif // include once
