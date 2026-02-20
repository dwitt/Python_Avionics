# GPS Module

Arduino GPS sensor module for the PiAvionics system. Reads an Adafruit Ultimate GPS via UART and broadcasts position, speed, altitude, and time data over CAN bus.

## Hardware

- Adafruit Feather RP2040
- Adafruit CAN Bus FeatherWing (MCP2515)
- Adafruit Ultimate GPS Breakout - 66 channel w/10 Hz updates - Version 3

## Pin Connections

| Signal | Feather Pin | Notes |
|--------|-------------|-------|
| GPS TX → RX | GPIO1 (Serial1 RX) | UART receive from GPS |
| GPS RX ← TX | GPIO0 (Serial1 TX) | UART transmit to GPS |
| CAN CS | GPIO7 | SPI chip select for MCP2515 |
| NeoPixel | GPIO16 | Status LED |

## CAN Bus Messages

All data is little-endian.

### 0x63 - GPS Coordinates (1 Hz)

| Byte 0-3 | Byte 4-7 |
|----------|----------|
| Latitude (int32, degrees x 1,000,000) | Longitude (int32, degrees x 1,000,000) |

### 0x64 - GPS Speed, Altitude, Track (1 Hz)

| Byte 0-1 | Byte 2-3 | Byte 4-5 | Byte 6-7 |
|----------|----------|----------|----------|
| Ground Speed (int16, knots) | Altitude (int16, feet) | True Track (int16, degrees) | Magnetic Track (int16, degrees) |

### 0x19 - Time Sync (1 Hz, only when valid date received)

| Byte 0 | Byte 1 | Byte 2 | Byte 3 | Byte 4 | Byte 5 | Byte 6 | Byte 7 |
|--------|--------|--------|--------|--------|--------|--------|--------|
| Year (since 2000) | Month | Day | Hour | Minute | Second | 0 | 0 |

## Arduino Library Dependencies

- Adafruit GPS Library (1.7.5+)
- Adafruit MCP2515 (0.2.1+)
- Adafruit NeoPixel (1.15.4+)

## Magnetic Declination (WMM2025)

Magnetic track is computed using the World Magnetic Model 2025 via the [XYZgeomag](https://github.com/nhz2/XYZgeomag) header-only library (MIT license). The model is valid from 2025 to 2030.

### Updating for WMM2030 (or later)

1. Download the new `.COF` file from [NOAA NCEI](https://www.ncei.noaa.gov/products/world-magnetic-model)
2. Place it in the `extras/` directory
3. Run the update script:
   ```bash
   cd extras
   python3 wmmcodeupdate.py -f WMM2030.COF -o ../XYZgeomag.hpp
   ```
4. Update the `#include` and model reference in `GPS_Module.ino` if the model name changes

### Files

| File | Purpose |
|------|---------|
| `XYZgeomag.hpp` | Header-only WMM library (included by sketch) |
| `extras/WMM2025.COF` | NOAA source coefficient data |
| `extras/wmmcodeupdate.py` | Python script to regenerate header from `.COF` file |

## GPS Configuration

- NMEA sentences enabled: RMC, GGA, GSA
- Update rate: 1 Hz
- Baud rate: 115200 (auto-configured from 9600 default)
