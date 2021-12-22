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
# pyright: reportMissingImports=false

import time
import random
import struct

import math

import board #pylint: disable=import-error
import busio #pylint: disable=import-error

import digitalio #pylint: disable=import-error
import neopixel #pylint: disable=import-error
#import bitbangio #pylint: disable=import-error



from adafruit_bno08x.i2c import BNO08X_I2C
#rom adafruit_bno08x.spi import BNO08X_SPI
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

from micropython import const #pylint: disable=import-error

# --- import based on board attribute -----------------------------------------

if hasattr(board, "CAN_RX"):
    import canio #pylint: disable=import-error
else:
    import adafruit_mcp2515 #pylint: disable=import-error
    from adafruit_mcp2515 import canio #pylint: disable=import-error

# -- Debugging Constants
DEBUG = False
DEBUG_CAL = False


# --- CAN Message Constants ---

CAN_EULER_MSG_ID = const(0x48)
CAN_ACC_MSG_ID = const(0x49)
CAN_Calib_Msg_id = const(0x23)

CAN_EULER_PERIOD = const(100)
CAN_ACC_PERIOD = const(100)

def main():
    """Main function"""
    if DEBUG:
        print("Starting AHRS module")

    count = 0

    can_euler_timestamp = 0
    can_acc_timestamp = 0

    # --- conversion constants
    radians_to_degrees_multiplier = 180 / math.pi

    # -----------------------------------------------------------------------------
    # --- Setup Communication buses for various peripherals                     ---
    # -----------------------------------------------------------------------------

    bno_reset = digitalio.DigitalInOut(board.D11)
    bno_reset.direction = digitalio.Direction.OUTPUT

    bno_reset.value = False # active low - reset the bno
    time.sleep(.1) # wait 100 ms second
    bno_reset.value = True # release the reset
    time.sleep(.2) # wait 200 ms for internal initialization and configuration

    # i2c bus ---------------------------------------------------------------------

    i2c = busio.I2C(board.SCL, board.SDA, frequency=400000, timeout = 1000)
    #i2c = board.I2C()
    #i2c = bitbangio.I2C(board.SCL, board.SDA, frequency = 100000)

    # spi bus ---------------------------------------------------------------------

    can_cs = digitalio.DigitalInOut(board.D25) # was 25 for RP2040 / 19 for M4
    can_cs.direction = digitalio.Direction.OUTPUT

    spi = board.SPI()

    # CAN bus (if built in) -------------------------------------------------------
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

    if hasattr(board, 'CAN_RX'):
        can = canio.CAN(rx=board.CAN_RX, tx=board.CAN_TX,
                    baudrate=250_000, auto_restart=True)
    else:
        # Use external can bus provided by mcp2515 on spi bus
        # documentation says the baud rate is based on 16Mhz but we have an 8Mhz
        # crystal so we need to double the baud rate to achieve 250000
        can = adafruit_mcp2515.MCP2515(spi_bus=spi, cs_pin=can_cs, # pylint: disable=no-member
                baudrate=500000)


    # -----------------------------------------------------------------------------
    # AHRS Module (BNO085)
    # -----------------------------------------------------------------------------

    bno = BNO08X_I2C(i2c, debug=False)

    if DEBUG:
        print("BNO Object created")

    bno.enable_feature(BNO_REPORT_ACCELEROMETER)
    bno.enable_feature(BNO_REPORT_GYROSCOPE)
    bno.enable_feature(BNO_REPORT_MAGNETOMETER, CALIBRATION_REPORT_INTERVAL)
    bno.enable_feature(BNO_REPORT_ROTATION_VECTOR)

    #bno.begin_calibration()

    # On board Neopixel
    pixel_pin = board.NEOPIXEL
    num_pixels = 1

    pixel = neopixel.NeoPixel(
        pixel_pin, num_pixels, brightness=1.0, auto_write=False,
        pixel_order=neopixel.GRB
    )

    #pixel_power = digitalio.DigitalInOut(board.NEOPIXEL_POWER)
    #pixel_power.direction = digitalio.Direction.OUTPUT

    pixel[0]= 0x0000ff
    pixel.brightness = .3

    #pixel_power.value = False


    # --- Create a CAN bus message mask for the Calibration message
    # --- and create a listener

    calibration_match = canio.Match(address=CAN_Calib_Msg_id)
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
        if current_time_millis - last_time_millis > 50:
            quat_i, quat_j, quat_k, quat_real = bno.quaternion
            accel_x, accel_y, accel_z = bno.acceleration
            gyro_x, gyro_y, gyro_z = bno.gyro #pylint: disable=unused-variable
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
            message = canio.Message(id=CAN_EULER_MSG_ID, data=euler_data)
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
            message = canio.Message(id=CAN_ACC_MSG_ID, data=acc_data)
            can.send(message)
            can_acc_timestamp = current_time_millis

        # -------------------------------------------------------------------------
        # --- check for calibration message on the CAN bus                      ---
        # -------------------------------------------------------------------------
        if calibration_listener.in_waiting():
            message = calibration_listener.receive()
            if isinstance(message, canio.RemoteTransmissionRequest):
                #TODO: look this up and see how to handle it correctly
                pass
            if isinstance(message, canio.Message):
                # Only process messages with the correct ID
                # Some random messages could be recieved at the begining
                #TODO: Review the actual calibration to see if it is really
                # required
                if message.id == CAN_Calib_Msg_id:
                    data = message.data
                    can_id = message.id
                    if DEBUG_CAL:
                        print(f"CAN id recieved = {can_id}")
                        print(f"Can data recieved = {data}")

                    if len(data) != 8:
                        if DEBUG:
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

                    if (calibration_command & 0b00010000) == 8:
                        bno.begin_calibration()
                        #pixel_power.value = True
                        pixel.show()
                    if (calibration_command & 0b00000001) == 1:
                        bno.save_calibration_data()
                        #pixel_power.value = False

        # -------------------------------------------------------------------------
        # --- Debuging display                                                  ---
        # -------------------------------------------------------------------------

        if DEBUG:
            print(f"{count:d}: Roll: {roll:.1f}, Pitch: {pitch:.1f}," +
                   "Yaw: {yaw:.1f}, Acc: {magnetometer_accuracy:1d}")
            count = count+1


if __name__ == '__main__':
    main()
