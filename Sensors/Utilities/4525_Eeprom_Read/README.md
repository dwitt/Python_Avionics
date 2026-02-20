# 4525 EEPROM Read

Standalone diagnostic tool to read the internal EEPROM of an MS4525DO differential pressure sensor over I2C.

## Purpose

The MS4525DO stores factory configuration in its EEPROM, including pressure range, sensor type (A/B), and I2C address. This sketch reads EEPROM register 0x02 and prints the raw value to Serial, which can be used to verify the sensor variant matches expectations.

## Usage

1. Flash to a Feather RP2040 with an MS4525DO connected to the default I2C bus (Wire)
2. Open Serial Monitor at 115200 baud
3. The EEPROM value is printed once on startup

## Configuration

- Sensor I2C address: `0x28` (default for MS4525DO)
- EEPROM register: `0x02`
- Serial baud: 115200
