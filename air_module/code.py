""" Air processing code for airspeed and altimeter"""
# pyright: reportMissingImports=false

import time
import random
import struct

import math

import board # pylint: disable=import-error

import digitalio # pylint: disable=import-error

from adafruit_mcp2515 import MCP2515 as CAN #pylint: disable=no-name-in-module
from adafruit_mcp2515 import canio  #pylint: disable=no-name-in-module

from honeywellHSC import HoneywellHSC
from NPXAnalogPressureSensor import NPXPressureSensor
from rolling_average import RollingAverage
from Regression import Regression
from kalman_filter import KalmanFilter


#from micropython import const

# Constants
DEBUG = False
DEBUG_DIFFERENTIAL = False
DEBUG_STATIC = False
DEBUG_ALT = False
DEBUG_VSI = False
DEBUG_QNH = False


# -----------------------------------------------------------------------------
# --- Constants for airspeed calculations                                   ---
# -----------------------------------------------------------------------------

# Used for calibrated airspeed (*** This calculation is not currently used ***)
GAMMA = 1.401                       # ratio of specific heats of air
SEA_LEVEL_PRESSURE_ISA = 101325     # Pa
SEA_LEVEL_DENSITY_ISA = 1.225       # Kg / ( m * s^2 )
MULTIPLIER = ((2 * GAMMA) / (GAMMA - 1) *
            (float(SEA_LEVEL_PRESSURE_ISA) / SEA_LEVEL_DENSITY_ISA))
EXPONENT = ( GAMMA - 1 ) / GAMMA
CONVERT_MPS_TO_KNOTS = 1.943844

# -----------------------------------------------------------------------------
# --- CAN Message Numbers                                                   ---
# -----------------------------------------------------------------------------

CAN_AIR_MSG_ID = 0x028
CAN_RAW_MSG_ID = 0x02B
CAN_QNH_MSG_ID = 0x02E

CAN_AIR_PERIOD = 100 # ms between messages
CAN_RAW_PERIOD = 500 # ms between messages
# change to 5 minutes from 6 seconds
CAN_QNH_PERIOD = 300000 # ms between messages

# -----------------------------------------------------------------------------
# --- VSI Storage Interval                                                  ---
# -----------------------------------------------------------------------------

VSI_PERIOD = 50 # ms for storage of data for VSI calculation
VSI_VALUES_TO_AVERAGE = 40 # low provides more response but more jitter



def main():
    """Main used to allow proper naming of Constants and Variables"""

    qnh = 2992
    previous_qnh = qnh

    can_air_timestamp = 0
    can_raw_timestamp = 0
    can_qnh_timestamp = 0

    vsi_timestamp = 0

    # -------------------------------------------------------------------------
    # --- Setup communication buses for various peripherals                 ---
    # -------------------------------------------------------------------------

    # i2c ---------------------------------------------------------------------

    i2c = board.I2C()

    # CAN module (built in) ---------------------------------------------------
    if hasattr(board, 'CAN_STANDBY'):
        standby = digitalio.DigitalInOut(board.CAN_STANDBY)
        standby.switch_to_output(False)
        if DEBUG:
            print("Standby off")

    if hasattr(board, 'BOOST_ENABLE'):
        boost_enable = digitalio.DigitalInOut(board.BOOST_ENABLE)
        boost_enable.switch_to_output(True)
        if DEBUG:
            print("Boost On")

    # CAN Power board ---------------------------------------------------------
    chip_select = digitalio.DigitalInOut(board.D25)
    chip_select.direction = digitalio.Direction.OUTPUT
    spi = board.SPI()

    # Our CAN board uses an 8 MHz crystal instead of 16 Mhz. Therefore
    # increase the baud rate by 2x from what we want (250,000 baud)
    can = CAN(spi_bus=spi, cs_pin=chip_select, baudrate=500000)

    # i2C - NPX Pressure Sensor via I2C ADS1115 -------------------------------

    my_ads = NPXPressureSensor(board.A1, board.A0, 0.09, 0.08)

    # i2c = Honeywell Pressure Sensor via i2c ---------------------------------

    my_hsc = HoneywellHSC(i2c, 0x28)

    # -------------------------------------------------------------------------
    # --- Setup Rolling Averages and Regression                             ---
    # -------------------------------------------------------------------------

    static_pressure_roll_avg = RollingAverage(120)
    differential_pressure_roll_avg = RollingAverage(60)
    vsi_regression = Regression(VSI_VALUES_TO_AVERAGE)

    # -------------------------------------------------------------------------
    # --- Create Kalman Filters                                             ---
    # -------------------------------------------------------------------------

    static_pressure_kalman = KalmanFilter(q=10 , r=1000000 , x=101324)
    differential_pressure_kalman = KalmanFilter(q=10, r=100000, x=0)

    # -------------------------------------------------------------------------
    # --- Create a CAN bus message mask for the QNH message and create a    ---
    # --- listener                                                          ---
    # -------------------------------------------------------------------------

    qnh_match = canio.Match(address=CAN_QNH_MSG_ID)#, mask=0x7FF)
    qnh_listener = can.listen(matches=[qnh_match], timeout=1)

    # -------------------------------------------------------------------------
    # --- Set the initial values to force a calculation on the first pass   ---
    # -------------------------------------------------------------------------

    static_pressure_average = 0
    differential_pressure_average = 0
    airspeed = 0
    altitude = 0
    vsi = 0

    # -------------------------------------------------------------------------
    # --- Main Loop                                                         ---
    # -------------------------------------------------------------------------
    # --- Tasks                                                             ---
    # --- 1. Read the pressures                                             ---
    # --- 2. Check if QNH has been transmitted                              ---
    # --- 3. Update QNH if received                                         ---
    # --- 4. Update the altitude if either the pressure or QNH changed      ---
    # --- 5. Calculate the VSI if the pressure changed                      ---
    # --- 6. Transmit CAN data for AAV, STATICP and QNH periodically        ---
    # -------------------------------------------------------------------------
    # --- Units
    # --- Static Pressure = kPa
    # --- QNH = inHg
    # --- Altitude = ft

    while True:

        current_time_millis = int(time.monotonic_ns() / 1000000)

        # ---------------------------------------------------------------------
        # --- Read the pressure transducers                                 ---
        # ---------------------------------------------------------------------

        # Static Pressure
        previous_static_pressure = static_pressure_average

        my_hsc.read_transducer()
        static_pressure = my_hsc.pressure
        # static_pressure_average = static_pressure_roll_avg.average(
        #     static_pressure)
        #TODO: Change the variable name. using average for expedience
        static_pressure_average = static_pressure_kalman.filter(
            static_pressure)

        if DEBUG_STATIC:
            print(f"static pressure: {static_pressure}, ave: {static_pressure_average}")

        # Differential Pressure
        previous_differential_pressure = differential_pressure_average

        differential_pressure = my_ads.pressure
        # differential_pressure_average = differential_pressure_roll_avg.average(
        #     differential_pressure)
        #TODO: Change the variable name. Using average for expedience
        differential_pressure_average = differential_pressure_kalman.filter(
            differential_pressure)

        if DEBUG_DIFFERENTIAL:
            print(f"differential pressure ave: {differential_pressure_average} ", end="")

        # ---------------------------------------------------------------------
        # --- Calculate the VSI                                             ---
        # ---------------------------------------------------------------------

        # TODO: Remove the following 2 lines if the period calcualtion works
        #       better.
        # Calculating this only when the pressure changes
        #if static_pressure_average != previous_static_pressure:

        # save data for VSI calculation each VSI_PERIOD

        if  current_time_millis > VSI_PERIOD + vsi_timestamp:
            vsi_timestamp = current_time_millis

            vsi_altitude = int(145442.0 * (
                1.0 -
                pow(float(static_pressure_average / 101325.0), 0.1902632)))

            # save the altitude and time for regression
            vsi_regression.save_point(vsi_altitude, current_time_millis)

            # calculate the vsi (slope of the line)
            vsi = vsi_regression.slope()

            if DEBUG_VSI:
                print(f'vsi: {vsi}')

        # ---------------------------------------------------------------------
        # --- Read the transducer temperature for transmission over CAN bus ---
        # ---------------------------------------------------------------------

        temperature = my_hsc.temperature

        # ---------------------------------------------------------------------
        # --- Calculate Air Speed if we have a new differential pressure    ---
        # ---------------------------------------------------------------------

        if previous_differential_pressure != differential_pressure_average:
            # calculate airspeed if pressure has changed

            # airspeed= CONVERT_MPS_TO_KNOTS * math.sqrt(MULTIPLIER * (
            #     pow((( abs(differential_pressure) / SEA_LEVEL_PRESSURE_ISA) + 1) ,
            #     EXPONENT) - 1))
            #
            airspeed = 2 * math.sqrt( 2 * abs(differential_pressure_average) /
                                    SEA_LEVEL_DENSITY_ISA )

            if DEBUG_DIFFERENTIAL:
                print(f"airspeed: {airspeed}")



        # ---------------------------------------------------------------------
        # --- Check for a QNH message on the CAN bus                        ---
        # ---------------------------------------------------------------------

        if qnh_listener.in_waiting():
            message = qnh_listener.receive()
            if DEBUG_QNH:
                print("message recieved")
                print(f"message id = {message.id}")
            if isinstance(message, canio.RemoteTransmissionRequest):
                pass
            if (isinstance(message, canio.Message) and
                message.id == CAN_QNH_MSG_ID):
                data = message.data
                if len(data) != 8:
                    print(f'Unusual message length {len(data)}')
                    continue # THIS JUMPS OUT OF THE WHILE LOOP???
                previous_qnh = qnh
                # unpack the message data
                # The QNH message contains two, two byte short integers
                (qnh_hpa, qnhx4, dummy_3, dummy_4, dummy_5, dummy_6) = struct.unpack("<hhBBBB",data)

                if DEBUG_QNH:
                    print(f"QNHX4 recieved = {qnhx4}")

                qnh = qnhx4 / 4.0

                # Sanitize incoming data
                if qnh < 2200:
                    qnh = 2200
                elif qnh > 3150:
                    qnh = 3150

                if DEBUG_QNH:
                    print(f"QNH recieved on CAN bus = {qnh}")

        # ---------------------------------------------------------------------
        # --- Calculate the altitue only if the pressure or QNH             ---
        # --- changed                                                       ---
        # ---------------------------------------------------------------------

        if (previous_static_pressure != static_pressure_average or
            previous_qnh != qnh):

            altitude = int(145442 * (
                pow(float(qnh / 2992), 0.1902632)
                - pow(float(static_pressure_average / 101325), 0.1902632)
            ))

        if DEBUG_ALT:
            print(f'altitude : {altitude}')

        # ---------------------------------------------------------------------
        # --- Send CAN data                                                 ---
        # ---------------------------------------------------------------------

        # --- Send Air Speed, Altitude and Vertical Speed                   ---
        if (current_time_millis > can_air_timestamp + CAN_AIR_PERIOD +
            random.randint(0,50)):

            air_data = struct.pack("<hBBBhB",
                                    int(airspeed),
                                    int(altitude) & 0x0ff,
                                    (int(altitude) >> 8) & 0xff,
                                    (int(altitude) >> 16) & 0xff,
                                    int(vsi),
                                    0)
            message = canio.Message(id=CAN_AIR_MSG_ID, data=air_data)
            can.send(message)
            can_air_timestamp = current_time_millis
            #print("Can Air")

        # --- Send Raw pressure and temperature sensor data                 ---
        if (current_time_millis > can_raw_timestamp + CAN_RAW_PERIOD +
            random.randint(0,50)):

            raw_data = struct.pack("<hbBBBBB",
                                int(static_pressure_average / 10),
                                int(temperature),
                                0,0,0,0,0)
            message = canio.Message(id=CAN_RAW_MSG_ID, data=raw_data)
            can.send(message)
            can_raw_timestamp = current_time_millis
            #print("Can Raw")

        # --- Send the qnh value if it has not been updated. qnh is         ---
        # --- normally sent from the display (rPi) but if not received is   ---
        # --- rebroadcast in case something else needs it.                  ---

        if current_time_millis > can_qnh_timestamp + CAN_QNH_PERIOD:
            qnh_hpa = int(qnh / 2.95299875)
            qnh_data = struct.pack("<hhBBBB",
                                    qnh_hpa,
                                    int(qnh*4),
                                    0,0,0,0)
            message = canio.Message(id=CAN_QNH_MSG_ID, data=qnh_data)
            can.send(message)
            can_qnh_timestamp = current_time_millis

if __name__ == '__main__':
    main()
