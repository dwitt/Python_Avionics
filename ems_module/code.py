"""
Engine Management code 
"""
import time
import random
import struct

import board # pylint: disable=import-error
import digitalio
import sys


import ltc2983

from adafruit_mcp2515 import MCP2515 as CAN #pylint: disable=no-name-in-module
from adafruit_mcp2515 import canio  #pylint: disable=no-name-in-module

# Debugging
DEBUG = True

# -----------------------------------------------------------------------------
# --- CAN Message Numbers
# -----------------------------------------------------------------------------
CAN_RPM_MSG_ID = 0x064
CAN_OIL_MSG_ID = 0X051
CAN_TEMP12_MSG_ID = 0x052
CAN_TEMP34_MSG_ID = 0x053

CAN_RPM_PERIOD = 500 # ms between messages (0.5 sec)
CAN_OIL_PERIOD = 600 # ms between messages (0.6 sec)
CAN_TEMP_PERIOD = 300 # ms between message (0.3 sec)

def main():
    """Main used to allow proper naming of Constants and Variables"""
    
    if DEBUG:
        print(f"Start of Main")
    
    # Set the starting time stamps for can message sending
    can_rpm_timestamp = 0
    can_oil_timestamp = 0
    can_temp_timestamp = 0
    
    # -------------------------------------------------------------------------
    # Setup communication buses for various peripherals
    # -------------------------------------------------------------------------

    # i2c ---------------------------------------------------------------------

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

    # spi ---------------------------------------------------------------------

    spi = board.SPI()

    # CAN Power Board - spi with cs on D25 ------------------------------------
    can_cs = digitalio.DigitalInOut(board.D25)
    can_cs.switch_to_output(True)

    # Our CAN board uses an 8 MHz crystal instead of 16 Mhz. Therefore
    # increase the baud rate by 2x from what we want (250,000 baud)
    can = CAN(spi_bus=spi, cs_pin=can_cs, baudrate=500000)

    # LTC2983 EMS Board - spi with cs on D24-----------------------------------

    ltc2983_cs = digitalio.DigitalInOut(board.D24)
    ltc2983_cs.switch_to_output(True)

    ltc2983_reset = digitalio.DigitalInOut(board.D5)
    ltc2983_reset.switch_to_output(True)

    ltc2983_interrupt = digitalio.DigitalInOut(board.D6)
    ltc2983_reset.switch_to_input()

    my_ltc2983 = ltc2983.LTC2983(cs=ltc2983_cs,
                                 reset=ltc2983_reset,
                                 interrupt=ltc2983_interrupt,
                                 spi_bus=spi)
    if DEBUG:
        print("LTC2983 object created")
        #sys.exit(1)
        
    # -------------------------------------------------------------------------
    # --- Communication buses configuration complete                        ---
    # -------------------------------------------------------------------------



    tc_config = my_ltc2983.pack_thermocouple(tc_type=ltc2983.LTC2983_TC_TYPE_J,
                              cold_junction_channel=20,
                              single=False,
                              oc_check=True,
                              oc_current=ltc2983.LTC2983_TC_CURRENT_10UA)

    print(f"Thermocouple Config is {tc_config:b}")

    my_ltc2983.write_channel_config(2,tc_config)
    my_config = my_ltc2983.read_channel_config(2)
    print(f"The config was {my_config:b}")
    
    my_ltc2983.write_channel_config(4,my_config)
    
    diode_config = my_ltc2983.pack_diode(single = True,
                                         three_readings = True,
                                         running_average = True,
                                         current = ltc2983.LTC2983_DIODE_CURRENT_10UA,
                                         ideality = 1.004)
    print(f"Diode Config is {diode_config:b}")
    
    # Configure channel 20 for the diode (Cold Junction Compensation)
    my_ltc2983.write_channel_config(20,diode_config)
    my_config = my_ltc2983.read_channel_config(20)
    print(f"The config was {my_config:b}")
    
    my_ltc2983.convert_channel(20)
    while (not my_ltc2983.conversion_complete()):
        pass
    my_temp = my_ltc2983.get_temperature(20)
    print(f"Diode Temperature = {my_temp:.2f}")
    
    # -------------------------------------------------------------------------
    # --- Create a CAN bus message mask for 

    # -------------------------------------------------------------------------
    # --- Main Loop                                                         ---
    # -------------------------------------------------------------------------
    # --- Tasks                                                             ---
    # --- 1. Read the temperatures                                          ---
    # --- 2. 
    # --- 3. 
    # --- 4. 
    # --- 5. 
    # --- 6. 
    # -------------------------------------------------------------------------
    # --- Units
    # --- Static Pressure = kPa
    # --- QNH = inHg
    # --- Altitude = ft

    while True:

        current_time_millis = int(time.monotonic_ns() / 1000000)
        
        
        my_ltc2983.convert_channel(2)
        while (not my_ltc2983.conversion_complete()):
            pass
        my_temp1 = my_ltc2983.get_temperature(2)
        print(f"TC Temperature 2= {my_temp1:.2f}")

        my_ltc2983.convert_channel(4)
        while (not my_ltc2983.conversion_complete()):
            pass
        my_temp2 = my_ltc2983.get_temperature(4)
        print(f"TC Temperature 4= {my_temp2:.2f}")
        
        time.sleep(1.0)
        #sys.exit(1)
        
        # ---------------------------------------------------------------------
        # --- Send CAN data                                                 ---
        # ---------------------------------------------------------------------
        
        # --- Send sample temperatures                                      ---
        
        if (current_time_millis > can_temp_timestamp + CAN_TEMP_PERIOD +
            random.randint(0,50)):
            
            temp12_data = struct.pack("<hhhh",
                                      int(my_temp1),
                                      int(my_temp2),
                                      0,
                                      0)
            message = canio.Message(id=CAN_TEMP12_MSG_ID, data=temp12_data)
            try:
                can.send(message)
            except RuntimeError as error:
                print("Temperature 1 and 2 send ", error)
            except: #pylint: disable=bare-except
                print("Unexpected error")
            can_temp_timestamp = current_time_millis

        
    print("Done\n")
if __name__ == '__main__':
    main()

