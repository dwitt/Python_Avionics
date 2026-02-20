# GPS Module - Arduino Implementation Plan

## Status: IMPLEMENTED

Compiled successfully with `arduino-cli` for `rp2040:rp2040:adafruit_feather`.
Code reviewed against `Legacy/gps_module/code.py` — all CAN messages, data packing, and GPS configuration match.

## Context
The Python GPS module in `Legacy/gps_module/code.py` runs on a Raspberry Pi Pico with CircuitPython. It reads an Adafruit Ultimate GPS via UART, parses NMEA sentences, and broadcasts position/speed/time data over CAN bus. This Arduino C++ equivalent in `Sensors/GPS_Module/` follows the conventions of the existing AIR_Module and IMU_AHRS modules.

## Hardware
- **Adafruit Feather RP2040** (same MCU board as other sensor modules)
- **Adafruit CAN Bus FeatherWing** (MCP2515, SPI, CS pin 7)
- **Adafruit Ultimate GPS Breakout** (UART, 9600 default -> 115200)

## CAN Messages (matching existing Python module & CAN Docs)

| ID | Name | Period | Data |
|----|------|--------|------|
| `0x63` | GPS Coordinates | 1000ms | lat (int32), lon (int32) — degrees x 1,000,000 |
| `0x64` | GPS Speed/Alt/Track | 1000ms | ground speed (int16, knots), altitude (int16, feet), true track (int16, degrees), unused (int16) |
| `0x19` | Time Sync | 1000ms | year, month, day, hour, minute, second, 0, 0 (uint8 x 8) |

## Files

- `Sensors/GPS_Module/GPS_Module.ino` — Main sketch
- `Sensors/GPS_Module/README.md` — Hardware setup, CAN format, pin connections

## Arduino Library Dependencies
- `Adafruit GPS Library` 1.7.5 (Adafruit_GPS.h)
- `Adafruit MCP2515` 0.2.1 (Adafruit_MCP2515.h)
- `Adafruit NeoPixel` 1.15.4 (Adafruit_NeoPixel.h)

## Verification Completed
- Compile: `arduino-cli compile --fqbn rp2040:rp2040:adafruit_feather Sensors/GPS_Module/` — PASS
- Code review: CAN IDs, data packing, NMEA config, baud rate sequence, data scaling all match Python version
- Remaining: Hardware bench test (flash to Feather RP2040, verify GPS fix and CAN output)
