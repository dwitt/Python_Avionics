# I2C Scan Test

Standalone diagnostic tool that scans the I2C bus and reports all responding device addresses.

## Purpose

Use this to verify that sensors are detected on the I2C bus at their expected addresses before running the main module sketches. Helpful for debugging wiring issues or confirming sensor addresses.

## Common Addresses

| Address | Device |
|---------|--------|
| 0x28 | MS4525DO pressure sensor (pitot / AOA) |
| 0x50 | 24LC32 EEPROM (IMU calibration) |
| 0x6A | ISM330DHCX (accel / gyro) |
| 0x78 | SSC static pressure sensor |
| 0x1C | LIS3MDL magnetometer |

## Usage

1. Flash to a Feather RP2040 with sensors connected
2. Open Serial Monitor at 9600 baud
3. The scan repeats every 5 seconds

## Configuration

- I2C bus: Wire (default, GPIO4/5 on Feather RP2040)
- Serial baud: 9600
