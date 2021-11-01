"""
GPS
===============================================================================

GPS module for Python_Avionics

* Author(s): David Witt

Implmentation Notes
-------------------

**Hardware:**

* `Adafruit Ultimate GPS Breakout - 66 channel w/10 Hz updates - Version 3 <https://www.adafruit.com/product/746>`
* `Raspberry Pi PICO <https://www.raspberrypi.com/products/raspberry-pi-pico/>`

"""
import time
import random
import struct

import board # type: ignore
import busio # type: ignore

import adafruit_mcp2515 # type: ignore
import adafruit_gps # type: ignore

from micropython import const # type:ignore

print("Starting GPS module")

# --- CAN Message Constants ---------------------------------------------------

CAN_GPGGA_ID = const(0x63)
CAN_GPRMC_ID = const(0x64)

CAN_GPGGA_PERIOD = const(1000)
CAN_GPRMC_PERIOD = const(1000)

# --- CAN timing variable initialization --------------------------------------

can_gpgga_timestamp = 0
can_gprmc_timestamp = 0

# -----------------------------------------------------------------------------
# --- Setup communication buses for various peripherals                     ---
# --- for Raspberry Pi PICO                                                 ---
# -----------------------------------------------------------------------------

# UART
uart = busio.UART(tx=board.TX, rx=board.RX, buadrate=9600, timeout=10)

# I2C
i2c = busio.I2C(scl=board.SCL, sda=board.SDA, frequency=800000)

# SPI
spi = busio.SPI(clock=board.SCL, MOSI=board.MOSI, MISO=board.MISO)

# GPS
gps_lowspeed = adafruit_gps.GPS(uart, debug=False)

# CAN
can = adafruit_mcp2515.MCP2515(spi_bus=spi0, cs_pin=board.GP17,
                               baudrate=250000, auto_restart = True ) # type: ignore

# -----------------------------------------------------------------------------
# --- Setup the GPS module                                                  ---
# -----------------------------------------------------------------------------

# change baud rate on the gps to 115200
gps_lowspeed.send_command(b"PMTK251,115200")
time.sleep(0.5)

# change the local serial port speed
uart.deinit()
uart = busio.UART(tx=board.TX, rx=board.RX, buadrate=115200, timeout=10)

# create a new gps object using the higher speed
gps = adafruit_gps(uart, debug=False)


# ENABLE GPRMC, GPGGA
# RMC contains:
#   UTC
#   Data Status
#   Latitude
#   N or S
#   Longitude
#   E or W
#   Speed over ground in knots
#   Track in degrees True
#   UT date
#   Magnetic variation
#   E or W
#   Checksum
# GGA contains:
#   UTC
#   Latitude
#   N or S
#   Longitude
#   E or W
#   GPS Quality (0=no fix, 1=GPS fix, 2=Dif. GPS fix)
#   Number of satellites
#   Altitude
#   Units of altitude M=metres
#   Geoidal separation
#   Units of separation M=metres
#   Age of Diffential GPS data (seconds)
#   DGPS station ID
#   Checksum
gps.send_command(b"PMTK314,0,1,0,1,0,0,0,0,0,0,0,0,0,0")

# Set the NEMA update rate to 1 second
gps.send_command(b"PMTK220,1000")

# -----------------------------------------------------------------------------
# --- Main Loop                                                             ---
# -----------------------------------------------------------------------------
# --- Tasks                                                                 ---
# --- 1. Update the gps object                                              ---
# --- 2. Update the gps data                                                ---
# --- 6. Transmit CAN data for GPRMC and GPGGA                              ---
# -----------------------------------------------------------------------------


while True:
    
    current_time_millis = int(time.monotonic_ns() / 1000000)

    gps.update()
    
    if gps.has_fix:
        # Update gps data for transmission