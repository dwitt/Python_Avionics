#include <Wire.h>

#define WIRE Wire 

void setup() {
    WIRE.begin();

    Serial.begin(115200);
    while (!Serial)
        delay(10);
    delay (5000);
    Serial.println("\nI2C Scanner");
    
    
    
}

void loop() {
    Serial.println("I2C Scanning...");
    for (int i = 0; i < 128; i++) {
}