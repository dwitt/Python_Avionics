# IMU AHRS Arduino Project

This project implements an Attitude and Heading Reference System (AHRS) using an Adafruit Feather RP2040 with ISM330DHCX and LIS3MDL sensors.

## Hardware Setup

- **Board**: Adafruit Feather RP2040
- **IMU**: Adafruit ISM330DHCX + LIS3MDL FeatherWing
- **CAN Bus**: Adafruit CAN Bus FeatherWing
- **Storage**: Adafruit 24LC32 I2C EEPROM

## Development Environment Setup

### Prerequisites

1. **Arduino CLI**: Install via Homebrew
   ```bash
   brew install arduino-cli
   ```

2. **Required Arduino Cores**:
   ```bash
   arduino-cli core install rp2040:rp2040
   arduino-cli core install adafruit:avr
   arduino-cli core install adafruit:samd
   ```

3. **Required Libraries** (install via Arduino IDE or arduino-cli):
   - Adafruit ISM330DHCX
   - Adafruit LSM6DS
   - Adafruit LIS3MDL
   - Adafruit MCP2515
   - Adafruit EEPROM I2C
   - Adafruit AHRS
   - Adafruit Sensor Calibration

### Cursor/VS Code Configuration

The project includes the following configuration files in `.vscode/`:

- **`c_cpp_properties.json`**: Configured with proper include paths for Arduino libraries and RP2040 core
- **`arduino.json`**: Board configuration for Adafruit Feather RP2040
- **`tasks.json`**: Build tasks for verify, upload, and monitor
- **`launch.json`**: Debug configuration

### Using Cursor for Arduino Development

1. **Build/Verify**: Press `Cmd+Shift+P` and run "Tasks: Run Task" → "Arduino: Verify"
2. **Upload**: Press `Cmd+Shift+P` and run "Tasks: Run Task" → "Arduino: Upload"
3. **Monitor**: Press `Cmd+Shift+P` and run "Tasks: Run Task" → "Arduino: Monitor"

### Command Line Usage

```bash
# Verify/Compile
arduino-cli compile --fqbn rp2040:rp2040:adafruit_feather --output-dir ../build .

# Upload
arduino-cli upload --fqbn rp2040:rp2040:adafruit_feather --port /dev/tty.usbmodem101 .

# Monitor
arduino-cli monitor --port /dev/tty.usbmodem101 --config baudrate=115200
```

## Features

- **Sensor Fusion**: Uses Adafruit AHRS library with NXP SensorFusion algorithm
- **CAN Bus Communication**: Sends attitude and acceleration data via CAN bus
- **Sensor Calibration**: Supports calibration via MotionCal and stores in EEPROM
- **Real-time Processing**: 100Hz update rate for sensor fusion

## CAN Bus Messages

- **Euler Angles** (ID: 0x48): Roll, Pitch, Yaw (degrees × 10)
- **Acceleration** (ID: 0x49): X, Y, Z acceleration (m/s² × 100)
- **Magnetometer** (IDs: 0x81-0x83): Raw magnetometer data

## Troubleshooting

### Include Path Errors
If you see include path errors in Cursor:
1. Ensure all required libraries are installed
2. Check that the paths in `c_cpp_properties.json` are correct for your system
3. Restart Cursor after making configuration changes

### Compilation Issues
- Verify the board is correctly set to "Adafruit Feather RP2040"
- Check that all required libraries are installed
- Ensure the correct port is specified in `arduino.json`

### Upload Issues
- Make sure the board is connected and the correct port is specified
- Try pressing the BOOTSEL button on the RP2040 if upload fails
- Check that no other application is using the serial port 