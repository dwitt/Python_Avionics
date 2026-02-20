#include <Wire.h>

// I2C Scanner for Wire1 interface
// This will scan all possible I2C addresses and report found devices

void setup() {
  // Initialize serial communication for debugging
  Serial.begin(9600);
  Serial.println("I2C Wire1 Scanner");
  Serial.println("Scanning for I2C devices on SDA=8, SCL=9...");
  
  // Initialize Wire1 interface with custom pins
  // Pin 8 = SDA (data), Pin 9 = SCL (clock)
  Wire1.setSDA(8);
  Wire1.setSCL(9);
  Wire1.begin();
  
  // Wait for serial to be ready
  while (!Serial) {
    delay(10);
  }
  
  Serial.println("Wire1 initialized with SDA=8, SCL=9");
  Serial.println("Starting I2C scan...");
  Serial.println();
}

void loop() {
  byte error, address;
  int nDevices = 0;
  
  Serial.println("Scanning...");
  
  for (address = 1; address < 127; address++) {
    // The i2c_scanner uses the return value of
    // the Write.endTransmission to see if
    // a device did acknowledge to the address.
    Wire1.beginTransmission(address);
    error = Wire1.endTransmission();
    
    if (error == 0) {
      Serial.print("I2C device found at address 0x");
      if (address < 16) {
        Serial.print("0");
      }
      Serial.println(address, HEX);
      nDevices++;
    } else if (error == 4) {
      Serial.print("Unknown error at address 0x");
      if (address < 16) {
        Serial.print("0");
      }
      Serial.println(address, HEX);
    }
  }
  
  if (nDevices == 0) {
    Serial.println("No I2C devices found\n");
  } else {
    Serial.print(nDevices);
    Serial.println(" device(s) found\n");
  }
  
  delay(5000); // Wait 5 seconds before next scan
}
