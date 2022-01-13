"""
GPS
===============================================================================

GPS module for Python_Avionics

* Author(s): David Witt

Implmentation Notes
-------------------

**Hardware:**

* `Adafruit Ultimate GPS Breakout - 66 channel w/10 Hz updates - Version 3
    <https://www.adafruit.com/product/746>`
* `Raspberry Pi PICO <https://www.raspberrypi.com/products/raspberry-pi-pico/>`

"""

# pyright: reportMissingImports=false

import time
import random
import struct

import board # pylint: disable=import-error
import busio # pylint: disable=import-error
import digitalio # pylint: disable=import-error

from adafruit_mcp2515 import MCP2515 as CAN # pylint: disable=no-name-in-module
from adafruit_mcp2515 import canio


import adafruit_gps # pylint: disable=import-error

from micropython import const # pylint: disable=import-error


# --- CAN Message Constants ---------------------------------------------------

CAN_GPS1_ID = const(0x63)
CAN_GPS2_ID = const(0x64)

CAN_GPS1_PERIOD = const(1000)
CAN_GPS2_PERIOD = const(1000)

# --- Converstion Constants ---------------------------------------------------

M_TO_FT = 3.28084


def main():

    # --- CAN timing variable initialization --------------------------------------

    can_gps1_timestamp = 0
    can_gps2_timestamp = 0

    # -----------------------------------------------------------------------------
    # --- Setup communication buses for various peripherals                     ---
    # --- for Raspberry Pi PICO                                                 ---
    # -----------------------------------------------------------------------------

    # UART - for GPS communication
    uart = busio.UART(tx=board.TX, rx=board.RX, baudrate=9600, timeout=10)

    # SPI - for CAN communication
    spi = board.SPI()

    # chip select for CAN
    chip_select = digitalio.DigitalInOut(board.D25)
    chip_select.direction = digitalio.Direction.OUTPUT

    # GPS
    gps_lowspeed = adafruit_gps.GPS(uart, debug=False)

    # CAN
    # Our CAN board uses an 8 MHz crystal instead of 16 Mhz. Therefore
    # increase the baud rate by 2x from what we want (250,000 baud)
    can = CAN(spi_bus=spi, cs_pin=chip_select, baudrate=500000)

    # -----------------------------------------------------------------------------
    # --- Setup the GPS module                                                  ---
    # -----------------------------------------------------------------------------

    # change baud rate on the gps to 115200
    gps_lowspeed.send_command(b"PMTK251,115200")
    time.sleep(0.5)

    # change the local serial port speed
    uart.deinit()
    uart = busio.UART(tx=board.TX, rx=board.RX, baudrate=115200, timeout=10)

    # create a new gps object using the higher speed
    gps = adafruit_gps.GPS(uart, debug=False)


    # ENABLE GPRMC, GPGGA

    # RMC contains:
    #   UTC [0]
    #   Data Status [1]
    #   Latitude [2] - NEEDED for CAN
    #   N or S
    #   Longitude [4] - NEEDED for CAN
    #   E or W
    #   Speed over ground in knots [6] - NEEDED for CAN
    #   Track in degrees True [7] - NEEDED for CAN
    #   UT date [8]
    #   Magnetic variation [9]
    #   E or W
    #   Checksum

    # GGA contains:
    #   UTC [0]
    #   Latitude [1]
    #   N or S
    #   Longitude [3]
    #   E or W
    #   GPS Quality [5] (0=no fix, 1=GPS fix, 2=Dif. GPS fix)
    #   Number of satellites [6]
    #   Horizontal dilution [7]
    #   Altitude [8] - NEEDED for CAN
    #   Units of altitude M=metres
    #   Geoidal separation [10]
    #   Units of separation M=metres
    #   Age of Diffential GPS data (seconds)
    #   DGPS station ID
    #   Checksum

    # Ask for specific data to be sent
    #                          A B C D E F G H                   I
    gps.send_command(b"PMTK314,0,1,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0")

    # A - send GLL - Geographic Position - Latitude/Longitude
    # B - send RMC - Recommended Minimum Navigation Information
    # C - sent VTG - Trak mad good and Ground Speed (not currently parsed)
    # D - send GGA - Global Positioning System Fix Data
    # E - send GSA - GPS DOP and active satellites
    # F - send GSV - Satelites in view
    # G - send GRS - GPS Range Residuals (not currently parsed)
    # H - Send GST - GPS Pseudorange Noise Statistics (not currently parsed)
    # I - send ZDA - Time & Date - UTC,day, month, year and local time zone (not currently parsed)


    # Set the NEMA update rate to 1 second
    gps.send_command(b"PMTK220,1000")

    latitude = 0
    longitude = 0
    speed_knots = 0
    altitude_feet = 0
    track_true_deg = 0
    track_mag_deg = 0
    vdop = 0


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

            # get the latitude and longitude in pure degrees
            # multiply by 1,000,000 to capture 6 decimal places
            # total of 9 digits - 4 byte int holds 9 significant digits without
            # loss of data
            # 6 decimal places accounts for 59' and 59.99"
            # Therefore, data storage accuracy is ot 0.01" (seconds)

            if gps.latitude is not None:
                latitude = int(gps.latitude * 1000000)
            if gps.longitude is not None:
                longitude = int(gps.longitude * 1000000)
            if gps.speed_knots is not None:
                speed_knots = int(gps.speed_knots)
            if gps.altitude_m is not None:
                altitude_feet = int(gps.altitude_m * M_TO_FT)
            if gps.track_angle_deg is not None:
                track_true_deg = int(gps.track_angle_deg)
                track_mag_deg = 0
            if gps.vdop is not None:
                vdop = gps.vdop


        if current_time_millis > can_gps1_timestamp + CAN_GPS1_PERIOD:
            gps1_data = struct.pack("<ii",
                                    latitude,
                                    longitude)
            message = canio.Message(id=CAN_GPS1_ID, data=gps1_data)

            try:
                can.send(message)
            except RuntimeError as err:
                # Handle a Runtime Error when not connected to CAN bus
                if err == "No transmit buffer available to send":
                    pass
                else:
                    print(f'RuntimeError: {err}')

            can_gps1_timestamp = current_time_millis

        if current_time_millis > can_gps2_timestamp + CAN_GPS2_PERIOD:
            gps2_data = struct.pack("<hhhh",
                                    speed_knots,
                                    altitude_feet,
                                    track_true_deg,
                                    track_mag_deg)
            message = canio.Message(id=CAN_GPS2_ID, data=gps2_data)
            try:
                can.send(message)
            except RuntimeError as err:
                # Handle a Runtime Error when not connected to CAN bus
                if err == "No transmit buffer available to send":
                    pass
                else:
                    print(f'RuntimeError: {err}')




            can_gps2_timestamp = current_time_millis

            print(f"lat = {latitude}, long = {longitude} , spd = {speed_knots} "+
                  f"alt = {altitude_feet}, vdop = {vdop}")

if __name__ == '__main__':
    main()
    