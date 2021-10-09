"""
AHRS 
===============================================================================

AHRS module using for Python_Avionics

* Author(s): David Witt

Implementation Notes
--------------------

**Hardware:**

* `Adafruit BNO08x Breakout <https:www.adafruit.com/products/4754>`_


"""
import time
import random
import struct

import board
import busio
import canio
import digitalio
import neopixel

import math

from adafruit_bno08x.i2c import BNO08X_I2C
from adafruit_bno08x import (
    BNO_REPORT_ACCELEROMETER,
    BNO_REPORT_GAME_ROTATION_VECTOR,
    BNO_REPORT_GYROSCOPE,
    BNO_REPORT_MAGNETOMETER,
    BNO_REPORT_ROTATION_VECTOR,
    CALIBRATION_REPORT_INTERVAL,
    SYSTEM_ORIENTATION,
    MAGNETOMETER_ORIENTATION
)

from quaternion import (
    euler_from_quaternion,
    radians_to_degrees,
)

from micropython import const # type: ignore

print("Starting AHRS module")

# -- Debugging Constants
DEBUG = True
count = 0

# --- CAN Message Constants ---

CAN_EULER_MSG_ID = const(0x48)
CAN_ACC_MSG_ID = const(0x49)
CAN_Calib_Msg_id = const(0x23)

CAN_EULER_PERIOD = const(100)
CAN_ACC_PERIOD = const(100)

can_euler_timestamp = 0
can_acc_timestamp = 0

# --- conversion constants
radians_to_degrees_multiplier = 180 / math.pi

# --- Setup Communication buses for various peripherals

# i2c bus
i2c = busio.I2C(board.SCL, board.SDA, frequency=800000)

# CAN bus (built in)
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

# -----------------------------------------------------------------------------
# AHRS Module (BNO085)
# -----------------------------------------------------------------------------
bno = BNO08X_I2C(i2c, debug=False)

bno.enable_feature(BNO_REPORT_ACCELEROMETER)
bno.enable_feature(BNO_REPORT_GYROSCOPE)
bno.enable_feature(BNO_REPORT_MAGNETOMETER, CALIBRATION_REPORT_INTERVAL)
bno.enable_feature(BNO_REPORT_ROTATION_VECTOR)

#bno.begin_calibration()

# On board Neopixel
pixel_pin = board.NEOPIXEL
num_pixels = 1
ORDER = neopixel.GRB

pixel = neopixel.NeoPixel(
    pixel_pin, num_pixels, brightness=1.0, auto_write=False, 
    pixel_order=ORDER
)

pixel_power = digitalio.DigitalInOut(board.NEOPIXEL_POWER)
pixel_power.direction = digitalio.Direction.OUTPUT

pixel[0]= 0x0000ff
pixel.brightness = .01

pixel_power.value = False


# --- Create a CAN bus message mask for the Calibration message
# --- and create a listener

calibration_match = canio.Match(id=CAN_Calib_Msg_id)
calibration_listener = can.listen(matches=[calibration_match], timeout = 0.01)

# initialize data
roll = 0
pitch = 0
yaw = 0
turn_rate = 0
accel_x = 0
accel_y = 0
accel_z = 0
magnetometer_accuracy = 0

last_time_millis = int(time.monotonic_ns() / 1000000)

# -----------------------------------------------------------------------------
# --- Main Loop                                                             ---
# -----------------------------------------------------------------------------
# --- Tasks                                                                 ---
# --- 1. read the rotation vector quaternion                                ---
# --- 2. convert the rotation vector from quaternion to euler               ---
# --- 3. read the acceleration                                              ---
# --- 4. calculate the slip                                                 ---
# --- 5. calculate the turn rate                                            ---
# --- 6. transmit CAN data periodiclly                                      ---
# -----------------------------------------------------------------------------


while True:
    # save the current time for comparison
    current_time_millis = int(time.monotonic_ns() / 1000000)
    # sample data every 50ms
    if (current_time_millis - last_time_millis > 50):
        quat_i, quat_j, quat_k, quat_real = bno.quaternion
        accel_x, accel_y, accel_z = bno.acceleration
        gyro_x, gyro_y, gyro_z = bno.gyro
        roll, pitch, yaw = radians_to_degrees(*euler_from_quaternion(
            quat_real, quat_i, quat_j, quat_k
            ))
        # apply yaw correction
        yaw = yaw * -1 + 90
        magnetometer_accuracy = bno.calibration_status
        
        turn_rate = gyro_z * radians_to_degrees_multiplier # degress/second
        
    # -------------------------------------------------------------------------
    # --- send CAN data                                                     ---
    # -------------------------------------------------------------------------
    # send euler angles and turn rate
    if (current_time_millis > can_euler_timestamp + CAN_EULER_PERIOD +
        random.randint(0,50)):
        euler_data = struct.pack("<hhhh", # little endian
                                 int(yaw),
                                 int(pitch),
                                 int(roll),
                                 int(turn_rate))
        message = canio.Message(CAN_EULER_MSG_ID, euler_data)
        can.send(message)
        can_euler_timestamp = current_time_millis
    
    # send accelerations and calibration magnatometer accuracy status
    if (current_time_millis > can_acc_timestamp + CAN_ACC_PERIOD + 
        random.randint(0, 50)):
        acc_data = struct.pack("<hhhh", 
                               int(accel_x * 100),
                               int(accel_y * 100),
                               int(accel_z * 100),
                               int(magnetometer_accuracy))
        message = canio.Message(CAN_ACC_MSG_ID, acc_data)
        can.send(message)
        can_acc_timestamp = current_time_millis
        
    # -------------------------------------------------------------------------
    # --- check for calibration message on the CAN bus                      ---
    # -------------------------------------------------------------------------
    if (calibration_listener.in_waiting()):
        message = calibration_listener.receive()
        if (isinstance(message, canio.RemoteTransmissionRequest)):
            #TODO: look this up and see how to handle it correctly
            pass
        if (isinstance(message, canio.Message)):
            data = message.data
            if len(data) != 8:
                if (DEBUG):
                    print(f'Unusual message length {len(data)}')
                continue # jump out to the while loop
            (calibration_command, _, _, _, _, _, _, _) = struct.unpack(
                "<BBBBBBBB", data
            )
            
            # bit 0 = true -> save calibration data
            # bit 1 = true -> pause calibration efforts
            # bit 2
            # bit 3
            # bit 4 = true -> enter calibration mode

            if ((calibration_command & 0b00010000) == 8):
                bno.begin_calibration()
                pixel_power.value = True
                pixel.show()
            if ((calibration_command & 0b00000001) == 1):
                bno.save_calibration_data()
                pixel_power.value = False
                
    # -------------------------------------------------------------------------
    # --- Debuging display                                                  ---
    # -------------------------------------------------------------------------
    
    if DEBUG:
        print(f"{count:d}: Roll: {roll:.1f}, Pitch: {pitch:.1f}, Yaw: {yaw:.1f}, Acc: {magnetometer_accuracy:1d}")
        count = count+1
        

            
            
            
                
#TODO: Delete the following
# -----------------------------------------------------------------------------            
# This was used for testing
while False:

    time.sleep(0.25)
    print("Acceleration:")
    accel_x, accel_y, accel_z = bno.acceleration  # pylint:disable=no-member
    print("X: %0.6f  Y: %0.6f Z: %0.6f  m/s^2" % (accel_x, accel_y, accel_z))
    print("")

    print("Gyro:")
    gyro_x, gyro_y, gyro_z = bno.gyro  # pylint:disable=no-member
    print("X: %0.6f  Y: %0.6f Z: %0.6f rads/s" % (gyro_x, gyro_y, gyro_z))
    print("")

    print("Magnetometer:")
    mag_x, mag_y, mag_z = bno.magnetic  # pylint:disable=no-member
    print("X: %0.6f  Y: %0.6f Z: %0.6f uT" % (mag_x, mag_y, mag_z))
    print("")

    print("Rotation Vector Quaternion:")
    quat_i, quat_j, quat_k, quat_real = bno.quaternion  # pylint:disable=no-member
    print(
        "I: %0.6f  J: %0.6f K: %0.6f  Real: %0.6f" % (quat_i, quat_j, quat_k, quat_real)
    )
    print("")
    
    print("Rotation Vector Roll, Pitch, Yaw:")
    r, p ,y = euler_from_quaternion(quat_real, quat_i, quat_j, quat_k);
    print(
        "Roll: %0.2f  Pitch: %0.2f  Yaw: %0.2f" % (r / math.pi * 180 , p / math.pi * 180, y / math.pi * 180)
    )
    print("")
    
    print("Calibration Status:")
    calibration = bno.calibration_status
    print(
        "Calibration: %1.0d" % (calibration)
    )
