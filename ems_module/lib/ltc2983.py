"""
`ltc2983'
=======================================

CircuitPython module for the LTC2983 Multi-Sensor High Accuracy Digital
Temperature Measurement System

* Author(s): David Witt

Implementation Notes
____________________

**Hardware:**

* Linear Technology `LTC2983`

* David Witt `EMS Wing`

** Software and Dependancies:**

* Adafruit CircuitPython firmware for the supported boards:
  https://circuitpython.org/downloads

* Adafruit's Bus Device library: https://github.com/adafruit/Adafruit_CircuitPython_BusDevice
"""
from micropython import const

from struct import *


import board
import digitalio
import time
import busio
import struct
import binascii
import sys


# Constants
DEBUG = True
DEBUG_READ_BYTE = False
DEBUG_TEMPERATURE = True

# Register and other constant values:
_LTC2983_COMMAND_STATUS = const(0x0000)
_LTC2983_TEMPERATURE_RESULTS = const(0x0010)
_LTC2983_GLOBAL_CONFIGURATION = const(0x00F0)
_LTC2983_MULTIPLE_MEASUREMENT_CHANNELS_BIT_MASK = const(0x00F4)
_LTC2983_MUX_CONFIGURATION_DELAY = const(0x00FF)
_LTC2983_CHANNEL_ASSIGNMENT_DATA = const(0x0200)
_LTC2983_CUSTOM_SENSOR_TABLE_DATA = const(0x0250)

# Commands
_LTC2983_READ = const(0b00000011)
_LTC2983_WRITE = const(0b00000010)

# Global Constants

LTC2983_TC_TYPE_J = const(1)
LTC2983_TC_TYPE_K = const(2)
LTC2983_TC_TYPE_E = const(3)
LTC2983_TC_TYPE_N = const(4)
LTC2983_TC_TYPE_R = const(5)
LTC2983_TC_TYPE_S = const(6)
LTC2983_TC_TYPE_T = const(7)
LTC2983_TC_TYPE_B = const(8)
LTC2983_TC_TYPE_CUSTOM = const(9)

LTC2983_TC_CURRENT_10UA = const(0)
LTC2983_TC_CURRENT_100UA = const(1)
LTC2983_TC_CURRENT_5000UA = const(2)
LTC2983_TC_CURRENT_1MA = const(3)

LTC2983_DIODE = const(28)

LTC2983_DIODE_CURRENT_10UA = const(0)
LTC2983_DIODE_CURRENT_20UA = const(1)
LTC2983_DIODE_CURRENT_40UA = const(2)
LTC2983_DIODE_CURRENT_80UA = const(3)


class LTC2983:
    """LTC2983 Digital Temperature Measurement System
    :param ~digitalio.DigitalInOut cs: Chip select pin for LTC2983
    :param ~digitalio.DigitalInOut reset: Reset pin for LTC2983
    :param ~board.spi SPI_bus: The SPI interface that connects to the LTC2983 
    :param ~digitalio.digiatlInOut interrupt: Interrupt pin for LTC2983
    """

    def __init__(self, cs, reset, interrupt, spi_bus = board.SPI()):
        self._spi_bus = spi_bus
        self._cs = cs
        self._reset = reset
        self._interrupt = interrupt

        #create a channel buffer
        self._channel_configuration = bytearray(4)

        self._cs.direction = digitalio.Direction.OUTPUT
        self._reset.direction = digitalio.Direction.OUTPUT
        self._interrupt.direction = digitalio.Direction.INPUT

        self._cs.value = True
        self._reset.value = True

        status = self.reset()
        if DEBUG:
            print(f"Status returned {status:b}")


    def reset(self):
        """ reset 
        Perform a hardware reset of the LTC2983
        """
        self._reset.value = False
        time.sleep(0.5)
        self._reset.value = True

        if DEBUG:
            print("Wait for interrupt to go high")
        while not self._interrupt.value:
            pass

        if DEBUG:
            print("Wait for Status Done bit")
        status = self.read_byte(_LTC2983_COMMAND_STATUS)
        while not status & 0b01000000:
            status = self.read_byte(_LTC2983_COMMAND_STATUS)

        return status

    def read_byte(self, address):
        """
        Read one byte of data from the address provided.
        
        :param int address: 2 byte unsigned address where the high nibble is 0 
        """
        while not self._spi_bus.try_lock():
            pass
        self._spi_bus.configure(baudrate=2000000, phase=0, polarity=0)
        self._cs.value = False
        spi_command = bytearray(3)
        spi_data = bytearray(1)
        pack_into(">BH",spi_command,0,_LTC2983_READ,address)
        self._spi_bus.write(spi_command)
        self._spi_bus.readinto(spi_data)
        self._cs.value = True
        self._spi_bus.unlock()
        return spi_data[0]

    def read_long(self, address):
        """read_long
        Read four bytes of data from the address provided
        :param int address: 2 byte unsigned address where the high nibble is 0 
        """
        while not self._spi_bus.try_lock():
            pass
        self._spi_bus.configure(baudrate=2000000, phase=0, polarity=0)
        self._cs.value = False
        spi_command = bytearray(3)
        spi_data = bytearray(4)
        struct.pack_into(">BH",spi_command,0,_LTC2983_READ,address)
        self._spi_bus.write(spi_command)
        self._spi_bus.readinto(spi_data)
        self._cs.value = True
        self._spi_bus.unlock()
        data = struct.unpack(">L",spi_data)
        return data[0]

    def write_byte(self, address, data):
        """write_byte
        Write one byte of data to the address provided
        :param address int: 2 byte unsigned address where the high nibble is 0
        :param data int: 1 byte unsigned integer to write"""
        while not self._spi_bus.try_lock():
            pass
        self._spi_bus.configure(baudrate=2000000, phase=0, polarity=0)
        self._cs.value = False
        spi_data = bytearray(4)
        pack_into(">BHB",spi_data,0,_LTC2983_WRITE, address, data)
        self._spi_bus.write(spi_data)
        self._spi_bus.unlock()

    def write_long(self, address, data):
        """write_long
        Write four bytes of data to the address provided
        
            :param address int: 2 byte unsigned address where the high nibble is 0
            :param data int: 4 byte unsigned long to write
        """
        while not self._spi_bus.try_lock():
            pass
        self._spi_bus.configure(baudrate=2000000, phase=0, polarity=0)
        self._cs.value = False
        spi_data = bytearray(7)
        struct.pack_into(">BHL",spi_data,0,_LTC2983_WRITE, address, data)
        self._spi_bus.write(spi_data)
        self._cs.value = True
        self._spi_bus.unlock()

    def write_channel_config(self, channel, configuration):
        """ Write the temperature measurement configuration to the specified
        channel
        
            :param channel int: The channel number for themeasurement device
            :param configuration int: The configuration for the channel
        """
        channel_memory = (channel - 1) * 4 + _LTC2983_CHANNEL_ASSIGNMENT_DATA
        print(f"Channel {channel_memory:b}")
        print(f"Configuration {configuration:b}")
        self.write_long(channel_memory, configuration)

    def read_channel_config(self, channel):
        """
        Read the temperature measurement configuration at the specified
        channel
        
            :param int channel: The channel number to read
        """
        channel_memory = (channel -1) * 4 + _LTC2983_CHANNEL_ASSIGNMENT_DATA
        data = self.read_long(channel_memory)
        return data

    def pack_thermocouple(self, tc_type, cold_junction_channel, single, oc_check, oc_current):
        """Pack the data for a thermocouple channel
        
            param: tc_type int: Thermocouple Type (0-9)
            param: cold_junction_channel int: The cold junction channel (1-20)
            param: single bool: Single ended connection if true else Differential
            param: oc_check bool: Perform open-curcuit check if true
            param: oc_current int: Open circuit current 
        """
        # Check data passed to function
        if (tc_type < 1 or
            tc_type > 9 ):
            raise RuntimeError("Bad thermocouple type")
        if (cold_junction_channel < 1 or
            cold_junction_channel > 20):
            raise RuntimeError("Cold junction channel out of range")
        if not isinstance(single, bool):
            raise RuntimeError("Connection type invalid (single/diff)")
        if not isinstance(oc_check, bool):
            raise RuntimeError("Open circuit check invalid")
        if (oc_current < 0 or
            oc_current > 3):
            raise RuntimeError("Open circuit current out of range")
        # The data has all been validated

        # Pack the data into the channel configuration buffer
        self._channel_configuration = (tc_type << 27 |
                                       cold_junction_channel << 22 |
                                       (int(single) & 0x1) << 21 |
                                       (int(oc_check) & 0x1) << 20 |
                                       (oc_current & 0x3) << 18)
        return self._channel_configuration

    def pack_diode(self, single, three_readings, running_average, current, ideality):
        """Pack the data for a diode channel
        param: single bool: Single ended connection if true else Differential
        param: three_readings bool: Take 3 readings if True otherwise 2 readings
        param: running_average bool: Enable running average when True
        param: current int: Exitation current (0-3)
        param: ideality float: Diode ideality  
        """
        # Check data passed to function
        if not isinstance(single, bool):
            raise RuntimeError("Connection type invalid (single/diff)")
        if not isinstance(three_readings, bool):
            raise RuntimeError("Number of readings must be True or false")
        if not isinstance(running_average, bool):
            raise RuntimeError("Running Average must be True or False")
        if (current < 0 or
            current > 3):
            raise RuntimeError("Excitation current out of range")
        if (ideality < 0 or
            ideality > 4):
            raise RuntimeError("Ideality must be between 0 and 4")
        # The data has all been validated

        sensor_type = LTC2983_DIODE

        ideality_factor = self.convert_ideality(ideality)

        # Pack the data into the channel configuration buffer
        self._channel_configuration = (sensor_type << 27 |
                                       (int(single) & 0x1) << 26 |
                                       (int(three_readings) & 0x1) << 25 |
                                       (int(running_average) & 0x1) << 24 |
                                       (current & 0x3) << 22 |
                                       (ideality_factor))

        return self._channel_configuration

    def convert_ideality(self, ideality):
        """
        Convert a float to an integer in the correct format to set the ideality
        :param ideality float: Diode ideality between 0.0 and 4.0
        """
        ideality_factor = int(ideality)
        if (ideality > 4.0 or ideality < 0.0):
            ideality = 1.003

        if ideality == 1.003:
            ideality_factor = 0
        else:
            ideality = ideality - int(ideality_factor)
            for i in range(20):
                ideality = ideality * 2
                ideality_factor = (ideality_factor << 1) + int(ideality)
                ideality = ideality - int(ideality)

        ideality_factor = ideality_factor & 0x3FFFFF
        return ideality_factor

    def convert_channel(self, channel):
        """
        Send the LTC a command to perform an A to D conversion on the 
        specified channel.
        
        :param channel int: The channel to be converted
        """
        if (channel <1 or channel >20):
            raise RuntimeError("Attempt to reach channel out of range.")
        self.write_byte(_LTC2983_COMMAND_STATUS, 0b10000000 | channel)

    def conversion_complete(self):
        """
        Return True if the conversion is complete."""
        status = self.read_byte(_LTC2983_COMMAND_STATUS) | 0b0100000
        interrupt_status = self._interrupt.value
        return (interrupt_status and status)

    def get_temperature(self, channel):
        """
        Get the temperature converstion for the specified channel.
        :param channel int: The channel to get the temperature from.
        """
        if (channel <1 or channel >20):
            raise RuntimeError("Attempt to reach channel out of range.")
        conversion_result = self.read_long(_LTC2983_TEMPERATURE_RESULTS +
                                           (channel - 1) * 4 )
        buffer = bytearray(4)
        struct.pack_into(">I",buffer,0,conversion_result)
        conversion_data = struct.unpack(">BBBB",buffer)
        # sign extend if sign bit is set
        if conversion_data[1] & 0x80:  # pylint: disable=unsubscriptable-object
            struct.pack_into(">B",buffer,0,0xFF)
        else:
            struct.pack_into(">B",buffer,0,0x00)
        # read sign extended result
        temperature_data = struct.unpack(">l",buffer)
        temperature = temperature_data[0] / 1024.0  # pylint: disable=unsubscriptable-object
        return temperature
