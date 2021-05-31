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

# Constants
OUTPUT_MIN = 1638
OUTPUT_MAX = 14745
PRESSURE_MIN = 0
PRESSURE_MAX = 103421

qnh = 2992
previous_qnh = qnh

# ----------------------------------------------------------------------
# --- CAN Message Numbers                                            ---
# ----------------------------------------------------------------------

CAN_Air_Msg_id = 0x028
CAN_Raw_Msg_id = 0x02B
CAN_QNH_Msg_id = 0x02E

CAN_Air_Period = 100 # ms between messages
CAN_Raw_Period = 500 # ms between messages
CAN_QNH_Period = 5000 # ms between messages

CAN_Air_Timestamp = 0
CAN_RAW_Timestamp = 0
CAN_QNH_Timestamp = 0

# --------------------------------------------------------------------
# --- Setup communication buses for various peripherals            ---
# --------------------------------------------------------------------

# i2c - Honeywell Static Pressure Transducer

i2c = board.I2C()
#i2c = busio.I2C(board.SCL, board.SDA)

# ----------------------------------------------------------------------
if hasattr(board, 'CAN_STANDBY'):
    standby = digitalio.DigitalInOut(board.CAN_STANDBY)
    standby.switch_to_output(False)
    print("Standby off")
    
if hasattr(board, 'BOOST_ENABLE'):
    boost_enable = digitalio.DigitalInOut(board.BOOST_ENABLE)
    boost_enable.switch_to_output(True)
    print("Boost On")
    
can = canio.CAN(rx=board.CAN_RX, tx=board.CAN_TX,
                baudrate=250_000, auto_restart=True)

# ----------------------------------------------------------------------
  
pressure_filter = KalmanFilter(q = 1, r = 1000, x = 101325)

my_hsc = HoneywellHSC(i2c, 0x28)

last_Time_Millis = int(time.monotonic_ns() / 1000000)
last_pressure_time_millis = last_Time_Millis

# -----------------------------------------------------------------------------
# --- Create a CAN bus message mask for the QNH message and create a        ---
# --- listener                                                              ---
# -----------------------------------------------------------------------------

qnh_match = canio.Match(id=CAN_QNH_Msg_id)
qnh_listener = can.listen(matches=[qnh_match], timeout=0.01)

# ------------------------------------------------------------------------------
# Wait here until we can lock the i2C to allow us to scan it
# ------------------------------------------------------------------------------


# while not i2c.try_lock():
#     pass

# try:

#     print("I2C address found:", [hex(device_address) for device_address
#                                  in i2c.scan()])
#     i2c.unlock()
# -----------------------------------------------------------------------------
try:

    # --- Read the initial presser from the transducer                      ---
    my_hsc.read_transducer()
    
    static_pressure = my_hsc.pressure
    static_pressure = pressure_filter.filter(static_pressure)
    
    altitude = int(145442.0 * (
        pow(float(qnh / 2992), 0.1902632)
        - pow(float(static_pressure / 101325), 0.1902632)))

    # --- Set the previous values to 0 to trigger future operations         ---
    previous_static_pressure = 0
    previous_altitude = 0

# ----------------------------------------------------------------------
# --- Main Loop                                                      ---
# ----------------------------------------------------------------------
# --- Tasks                                                          ---
# --- 1. Read the pressure periodically                              ---
# --- 2. Check if QNH has been transmitted                           ---
# --- 3. Update QNH and the QNH display if received                  ---
# --- 4. Update the altitude if either the pressure or QNH have change -
# --- 5. Update the local display only when the values change and    ---
# ---    only if a resonable interval has elapsed. (conserve cycles) ---
# --- 6. Transmit CAN data for AAV, STATICP and QNH periodically     ---
# ----------------------------------------------------------------------
# --- Units
# --- Static Pressure = kPa
# --- QNH = inHg
# --- Altitude = ft
 
    while True:

        current_time_millis = int(time.monotonic_ns() / 1000000)

#       --- Read the pressure transducer after every 50 ms           ---

        if current_time_millis - last_Time_Millis > 50:
            # read the pressure transducer
            my_hsc.read_transducer()
            
            previous_static_pressure = static_pressure
            static_pressure = my_hsc.pressure
            static_pressure = pressure_filter.filter(static_pressure)
            
            last_Time_Millis = current_time_millis

        # ---------------------------------------------------------------------
        # --- Check for a QNH message on the CAN bus                        ---
        # ---------------------------------------------------------------------
        
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
        # --- Calculate the altitued only if the pressure or QNH            ---
        # --- changed                                                       ---
        # ---------------------------------------------------------------------

        if (previous_static_pressure != static_pressure or 
            previous_qnh != qnh):

            previous_altitude = altitude
            altitude = int(145442.0 * (
                pow(float(qnh / 2992), 0.1902632)
                - pow(float(static_pressure / 101325), 0.1902632)
            ))
            
            time_between_altitude_calculations = current_time_millis - last_pressure_time_millis
            vsi = (altitude - previous_altitude) / time_between_altitude_calculations * 60000
            

        my_hsc.read_transducer()
        temperature = my_hsc.temperature

        # ---------------------------------------------------------------------
        # --- Send CAN data                                                 ---
        # ---------------------------------------------------------------------

        # --- Send Air Speed, Altitude and Vertical Speed                   ---
        if (current_time_millis > CAN_Air_Timestamp + CAN_Air_Period + 
            random.randint(0,50)):
            
            Air_data = struct.pack("<hBBBhB",
                                   0,
                                   altitude & 0x0ff,
                                   (altitude >> 8) & 0xff,
                                   (altitude >> 16) & 0xff,
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
                                int(static_pressure / 10),
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
            #print("Can QNH")

        
finally:
    print("Unlocking")
    i2c.unlock()


