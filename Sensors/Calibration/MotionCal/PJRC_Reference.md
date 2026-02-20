# MotionCal Reference (from PJRC)

Saved from https://www.pjrc.com/store/prop_shield.html — the MotionCal-relevant sections.

## Downloads (PJRC originals — pre-built, may not work on Apple Silicon)

- [MotionCal - Windows](http://www.pjrc.com/teensy/beta/imuread/MotionCal.exe)
- [MotionCal - Linux 64 bit](http://www.pjrc.com/teensy/beta/imuread/MotionCal.linux64)
- [MotionCal - Macintosh](http://www.pjrc.com/teensy/beta/imuread/MotionCal.dmg)
- [Source code - upstream](https://github.com/PaulStoffregen/MotionCal) (GitHub)
- [Source code - Apple Silicon fork](https://github.com/IanBUK/MotionCal) (GitHub, used for this build)

## Calibration Process

1. Upload the calibration sketch to the board (in our case, `IMU_Calibration.ino`)
2. Open Arduino Serial Monitor to verify raw data is printing rapidly, then close it
3. Launch MotionCal
4. Use the **Port menu** to select the serial port (Arduino Serial Monitor must be closed)
5. Physically rotate the sensor board to collect calibration data from many angles
6. Monitor the 4 error numbers — these decrease as better calibration data accumulates
7. Watch for red dots forming a sphere which rotates perfectly centered
8. Use **File > Send Calibration** to write calibration data back to the board

The calibration sketch receives a 68-byte packet over serial containing:
- Accelerometer zero-g offsets (3 floats)
- Gyroscope zero-rate offsets (3 floats)
- Magnetometer hard-iron offsets (3 floats)
- Magnetic field magnitude (1 float)
- Soft-iron calibration matrix (6 floats, compressed 3x3 symmetric)
- CRC16 checksum

Our `IMU_Calibration.ino` saves this data to the 24LC32 EEPROM via the DW_Sensor_Calibration library.

## Serial Data Format (what MotionCal expects)

The calibration sketch must output data in this format:

```
Raw:<ax>,<ay>,<az>,<gx>,<gy>,<gz>,<mx>,<my>,<mz>
```

Where:
- Accelerometer values: `int(round(accel * 8192 / 9.8))`
- Gyroscope values: `int(round(gyro_rads * SENSORS_RADS_TO_DPS * 16))`
- Magnetometer values: `int(round(mag_uT * 10))`

Optional unified debug output:
```
Uni:<ax>,<ay>,<az>,<gx>,<gy>,<gz>,<mx>,<my>,<mz>
```

Where values are in standard SI units (m/s², rad/s, µT).

## Post-Calibration Verification

After calibration is saved, flash `IMU_Calibration_read.ino` to read back and display the stored calibration values from EEPROM.

## Building MotionCal on macOS (Apple Silicon)

The PJRC pre-built `.dmg` does not detect serial ports on Apple Silicon Macs. Use the IanBUK fork instead:

```bash
# wxWidgets must be installed (brew install wxwidgets)
git clone https://github.com/IanBUK/MotionCal.git
cd MotionCal

# Ensure MACOSX_CLANG is the active OS in the Makefile
# For wxWidgets 3.3+, add -std=c++11 to CXXFLAGS
make
open MotionCal.app
```

The built `.app` is a native arm64 binary.
