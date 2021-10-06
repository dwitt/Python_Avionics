import time
import random
import struct

import board
import busio
import canio
import digitalio

from digitalio import DigitalInOut, Direction, Pull

from honeywellHSC import HoneywellHSC 
from kalman_filter import KalmanFilter
from NPXAnalogPressureSensor import NPXPressureSensor
from rolling_average import RollingAverage
from Regression import Regression

import adafruit_ADS1x15.ads1115 as ADS
from adafruit_ads1x15.analog_in import AnalogIn

from micropython import const # type: ignore

import math

# Constants
DEBUG = False
DEBUG_DIFFERENTIAL = False
DEBUG_STATIC = False
DEBUG_VSI = False

# ---

OUTPUT_MIN = 1638
OUTPUT_MAX = 14745
PRESSURE_MIN = 0
PRESSURE_MAX = 103421

qnh = 2992
previous_qnh = qnh

# -----------------------------------------------------------------------------
# --- Constants for airspeed calculations                                   ---
# -----------------------------------------------------------------------------

# Used for calibrated airspeed (*** Not Used ***)
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

CAN_Air_Msg_id = 0x028
CAN_Raw_Msg_id = 0x02B
CAN_QNH_Msg_id = 0x02E

CAN_Air_Period = 100 # ms between messages
CAN_Raw_Period = 500 # ms between messages
CAN_QNH_Period = 5000 # ms between messages

CAN_Air_Timestamp = 0
CAN_RAW_Timestamp = 0
CAN_QNH_Timestamp = 0

# -----------------------------------------------------------------------------
# --- Setup communication buses for various peripherals                     ---
# -----------------------------------------------------------------------------

# i2c -------------------------------------------------------------------------

i2c = board.I2C()

# CAN module (built in) -------------------------------------------------------
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
    
can = canio.CAN(rx=board.CAN_RX, tx=board.CAN_TX,
                baudrate=250_000, auto_restart=True)

# i2C - NPX Pressure Sensor via I2C ADS1115 -----------------------------------

my_ads = NPXPressureSensor(i2c)   

# i2c = Honeywell Pressure Sensor via i2c -------------------------------------

my_hsc = HoneywellHSC(i2c, 0x28)

# -----------------------------------------------------------------------------
# --- Setup Rolling Averages and Regression                                 ---
# -----------------------------------------------------------------------------

static_pressure_roll_avg = RollingAverage(120)
differential_pressure_roll_avg = RollingAverage(60)
vsi_regression = Regression(120)

# -----------------------------------------------------------------------------
# --- Create a CAN bus message mask for the QNH message and create a        ---
# --- listener                                                              ---
# -----------------------------------------------------------------------------

qnh_match = canio.Match(id=CAN_QNH_Msg_id)
qnh_listener = can.listen(matches=[qnh_match], timeout=0.01)

# -----------------------------------------------------------------------------
# --- Set the initial values to force a calculation on the first pass       --- 
# -----------------------------------------------------------------------------

static_pressure_average = 0
differential_pressure_average = 0
airspeed = 0
altitude = 0
vsi = 0

# ----------------------------------------------------------------------
# --- Main Loop                                                      ---
# ----------------------------------------------------------------------
# --- Tasks                                                          ---
# --- 1. Read the pressures                                          ---
# --- 2. Check if QNH has been transmitted                           ---
# --- 3. Update QNH if received                                      ---
# --- 4. Update the altitude if either the pressure or QNH changed   ---
# --- 5. Calculate the VSI if the pressure changed                   ---
# --- 6. Transmit CAN data for AAV, STATICP and QNH periodically     ---
# ----------------------------------------------------------------------
# --- Units
# --- Static Pressure = kPa
# --- QNH = inHg
# --- Altitude = ft

while True:

    current_time_millis = int(time.monotonic_ns() / 1000000)

    # -------------------------------------------------------------------------
    # --- Read the pressure transducers                                     ---
    # -------------------------------------------------------------------------

    # Static Pressure
    previous_static_pressure = static_pressure_average
    
    my_hsc.read_transducer()
    static_pressure = my_hsc.pressure  
    static_pressure_average = static_pressure_roll_avg.average(
        static_pressure)
        
    if DEBUG_STATIC:
        print(f"static pressure ave: {static_pressure_average}")
    
    # Differential Pressure
    previous_differential_pressure = differential_pressure_average
    
    differential_pressure = my_ads.pressure
    differential_pressure_average = differential_pressure_roll_avg.average(
        differential_pressure)
    
    if DEBUG_DIFFERENTIAL:
        print(f"differential pressure ave: {differential_pressure_average}", end="")

    # -------------------------------------------------------------------------
    # --- Calculate the VSI                                                 ---
    # -------------------------------------------------------------------------
    
    # Try calculating this only when the pressure changes 
    if (static_pressure_average != previous_static_pressure):
    
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

    # -------------------------------------------------------------------------
    # --- Calculate Air Speed if we have a new differential pressure        ---
    # -------------------------------------------------------------------------
    
    if (previous_differential_pressure != differential_pressure_average):
        # calculate airspeed if pressure has changed
        
        # airspeed= CONVERT_MPS_TO_KNOTS * math.sqrt(MULTIPLIER * (
        #     pow((( abs(differential_pressure) / SEA_LEVEL_PRESSURE_ISA) + 1) ,
        #     EXPONENT) - 1))
        
        # 
        airspeed = 2 * math.sqrt( 2 * abs(differential_pressure_average) /
                                 SEA_LEVEL_DENSITY_ISA )

        if DEBUG_DIFFERENTIAL:
            print(f"airspeed: {airspeed}")

    

    
    # -------------------------------------------------------------------------
    # --- Check for a QNH message on the CAN bus                            ---
    # -------------------------------------------------------------------------
    
    if (qnh_listener.in_waiting()):
        message = qnh_listener.receive()
        
        if (isinstance(message, canio.RemoteTransmissionRequest)):
            pass
        if (isinstance(message, canio.Message)):
            data = message.data
            if len(data) != 8:
                print(f'Unusual message length {len(data)}')
                continue # THIS JUMPS OUT OF THE WHILE LOOP???
            previous_qnh = qnh
            # unpack the message data
            # QNH contains two, two byte short integers
            (qnh_hpa, qnhx4, null3, null4, null5, null6) = struct.unpack("<hhBBBB",data)

            qnh = qnhx4 / 4.0

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
        
    if DEBUG_STATIC:
        print(f'altitude : {altitude}')
        
    # ---------------------------------------------------------------------
    # --- Send CAN data                                                 ---
    # ---------------------------------------------------------------------

    # --- Send Air Speed, Altitude and Vertical Speed                   ---
    if (current_time_millis > CAN_Air_Timestamp + CAN_Air_Period + 
        random.randint(0,50)):
        
        Air_data = struct.pack("<hBBBhB",
                                int(airspeed),
                                int(altitude) & 0x0ff,
                                (int(altitude) >> 8) & 0xff,
                                (int(altitude) >> 16) & 0xff,
                                int(vsi),
                                0)
        message = canio.Message(CAN_Air_Msg_id, Air_data)
        can.send(message)
        CAN_Air_Timestamp = current_time_millis
        #print("Can Air")
        
    # --- Send Raw pressure and temperature sensor data                 ---  
    if (current_time_millis > CAN_RAW_Timestamp + CAN_Raw_Period +
        random.randint(0,50)):
        
        Raw_data = struct.pack("<hbBBBBB",
                            int(static_pressure_average / 10),
                            int(temperature),
                            0,0,0,0,0)
        message = canio.Message(CAN_Raw_Msg_id, Raw_data)
        can.send(message)
        CAN_RAW_Timestamp = current_time_millis
        #print("Can Raw")
        
    # --- Send the qnh value if it has not been updated. qnh is         ---
    # --- normally sent from the display (rPi) but if not received is   ---
    # --- rebroadcast in case something else needs it.                  ---
    if (current_time_millis > CAN_QNH_Timestamp + CAN_QNH_Period):
        qnh_hpa = int(qnh / 2.95299875)
        QNH_data = struct.pack("<hhBBBB",
                                qnh_hpa,
                                int(qnh*4),
                                0,0,0,0)
        message = canio.Message(CAN_QNH_Msg_id, QNH_data)
        can.send(message)
        CAN_QNH_Timestamp = current_time_millis
