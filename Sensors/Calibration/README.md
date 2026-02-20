# IMU Calibration Tools

These tools are used to calibrate the ISM330DHCX + LIS3MDL IMU on the Adafruit Feather RP2040 using [MotionCal](https://www.pjrc.com/store/prop_shield.html) (PJRC). Calibration data is stored on a 24LC32 I2C EEPROM (0x50) and loaded at startup by the production IMU_AHRS module.

## Workflow

1. Flash **IMU_Calibration** to the Feather RP2040
2. Open MotionCal on a computer, connect to the board's serial port
3. Wave the sensor through all orientations until MotionCal computes good calibration values
4. MotionCal sends a 68-byte calibration packet over serial, which the sketch saves to EEPROM
5. Flash **IMU_Calibration_read** to verify the stored values look correct

## Directories

### DW_Sensor_Calibration/ — Calibration Storage Library

A reusable Arduino library that manages saving and loading calibration data to/from EEPROM.

- **Base class** `Sensor_Calibration` — applies calibration offsets to accel/gyro/mag sensor events
- **EEPROM class** `Sensor_Calibration_EEPROM` — saves/loads 68-byte calibration packets to 24LC32 EEPROM over I2C with CRC16 validation

**68-byte packet format:**

| Bytes | Content |
|-------|---------|
| 0-1 | Header: 0x75, 0x54 |
| 2-13 | Accel zero-g offsets (3 floats, m/s^2) |
| 14-25 | Gyro zero-rate offsets (3 floats, rad/s) |
| 26-37 | Mag hard-iron offsets (3 floats, uT) |
| 38-41 | Mag field magnitude (1 float, uT) |
| 42-65 | Mag soft-iron matrix (6 floats, compressed 3x3 symmetric) |
| 66-67 | CRC16 checksum (little-endian) |

**Files:**

| File | Purpose |
|------|---------|
| `Sensor_Calibration.h` | Base class with calibrate() method |
| `Sensor_Calibration.cpp` | CRC16 and calibration application logic |
| `Sensor_Calibration_EEPROM.h` | EEPROM subclass header |
| `Sensor_Calibration_EEPROM.cpp` | EEPROM save/load/print implementation |
| `library.properties` | Arduino library metadata |
| `keywords.txt` | Syntax highlighting for Arduino IDE |

### IMU_Calibration/ — Calibration Collection Sketch

The active calibration sketch. Reads raw accel/gyro/mag data from the ISM330DHCX + LIS3MDL and outputs it in MotionCal's expected format over serial. When MotionCal sends calibration data back, the sketch saves it to EEPROM.

**Serial output formats:**
- `Raw:` — scaled integer values for MotionCal (accel*8192/9.8, gyro*16, mag*10)
- `Uni:` — unified sensor values for debugging (m/s^2, rad/s, uT)
- `Cal1:` / `Cal2:` — periodic calibration value printout

**Hardware:** Feather RP2040, ISM330DHCX (0x6A), LIS3MDL (0x1C), MCP2515 CAN (CS pin 7), 24LC32 EEPROM (0x50)

### IMU_Calibration_read/ — Calibration Verification Sketch

A copy of IMU_Calibration with the `loop()` entirely commented out. On startup it loads and prints the stored calibration values, then sits idle. Use this to verify calibration was saved correctly to EEPROM.

**Printed at startup:**
- Magnetic hard-iron offsets (x, y, z)
- Magnetic soft-iron matrix (3x3)
- Magnetic field magnitude
- Gyro zero-rate offsets (x, y, z)
- Accel zero-g offsets (x, y, z)

## Sensor Configuration

| Parameter | Value |
|-----------|-------|
| Accel range | +/- 4G |
| Accel rate | 104 Hz |
| Gyro range | 250 DPS |
| Gyro rate | 104 Hz |
| Mag range | 4 Gauss |
| Mag rate | 1000 Hz |
| Mag power | Medium |
| Mag mode | Continuous |
| I2C speed | 400 kHz |
| Serial baud | 115200 |
