#include <Wire.h>

const uint8_t SENSOR_ADDR = 0x28;         // 7-bit address
const uint8_t FIRST_COMMAND[3] = { 0xA0, 0x00, 0x00 };
const uint8_t EEPROM_ADDR[3] = { 0x02, 0x00, 0x00 };

void setup() {
  delay(7);

  Wire.begin();
  //Wire.setClock(100000);

  // --- Phase 1: send 0xA0 0x00 0x00 to SENSOR_ADDR ---
  Wire.beginTransmission(SENSOR_ADDR);
  Wire.write(FIRST_COMMAND, 3);
  Wire.endTransmission(false);  // repeated start


  //delay(10);
  // --- Phase 2: send EEPROM address + 0x00 + 0x00 ---
  Wire.beginTransmission(SENSOR_ADDR);
  Wire.write(EEPROM_ADDR, 3);  // EEPROM address
  Wire.endTransmission(false);  // repeated start again

  // --- Phase 3: read 3-byte response ---
  delay(10);  // small delay to allow sensor to respond
  byte number_bytes = Wire.requestFrom(SENSOR_ADDR, (uint8_t)3);

  uint8_t response[3] = {0,0,0};
  for (int i = 0; i < 3 && Wire.available(); ++i) {
    response[i] = Wire.read();
  }

  // After the I2C exchange, now OK to initialize Serial
  Serial.begin(115200);
  while (!Serial) delay(10);

  // Parse response

    uint16_t eepromWord = (response[1] << 8) | response[2];
    Serial.print("Response byte = ");
    Serial.println(response[0], HEX);
    Serial.print("EEPROM[0x");
    Serial.print(EEPROM_ADDR[0], HEX);
    Serial.print("] = 0x");
    Serial.println(eepromWord, HEX);
  
}

void loop() {
  // nothing
}