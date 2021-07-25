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
import board
import busio
import canio
import digitalio

import math

from adafruit_bno08x.i2c import BNO08X_I2C
from adafruit_bno08x import (
    BNO_REPORT_ACCELEROMETER,
    BNO_REPORT_GYROSCOPE,
    BNO_REPORT_MAGNETOMETER,
    BNO_REPORT_ROTATION_VECTOR,
)

from quaternion import euler_from_quaternion

from micropython import const # type: ignore

# -- Debugging Constants
DEBUG = const(True)

# --- CAN Message Constants ---

CAN_Euler_Msg_id = const(0x48)
CAN_Acc_Msg_id = const(0x49)
CAN_Calib_Msg_id = const(0x23)

CAN_Euler_Period = const(100)
CAN_Acc_Period = const(100)

CAN_Euler_Timestamp = 0
CAN_Acc_TimeStamp = 0

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

# AHRS Module
bno = BNO08X_I2C(i2c)

bno.enable_feature(BNO_REPORT_ACCELEROMETER)
bno.enable_feature(BNO_REPORT_GYROSCOPE)
bno.enable_feature(BNO_REPORT_MAGNETOMETER)
bno.enable_feature(BNO_REPORT_ROTATION_VECTOR)

# --- Create a CAN bus message mask for the Calibration message
# --- and create a listener

calib_match = canio.Match(id=CAN_Calib_Msg_id)
calib_listener = can.listen(matches=[calib_match], timeout = 0.01)


while True:

    time.sleep(0.5)
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
    

 
