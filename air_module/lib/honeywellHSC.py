
import board
import busio

from rolling_average import RollingAverage
from micropython import const # type: ignore

# pressure sensor constants
_OUTPUT_MIN = const(1638)
_OUTPUT_MAX = const(14745)
_PRESSURE_MIN = const(0)
_PRESSURE_MAX = const(103421)


class HoneywellHSC:

    def __init__(self, i2c, address = 0x028):
        self._address = address
        self._input_buffer = bytearray(4)
        self._i2c = i2c
        self._average = RollingAverage(120)
        

    def read_transducer(self):
        self._data_read = False
        try:
            self._i2c.try_lock()
            self._i2c.readfrom_into(self._address, self._input_buffer)
            self._data_read = True
        finally:
            self._i2c.unlock()
        return self._data_read

    @property
    def pressure(self):
        # reduced number of bits to only the 11 MSB instead of 14 - dropped the lower 3
        self._bridge_data = (((self._input_buffer[0] & 0b00111111) << 8) | self._input_buffer[1] & 0b11111000)
        self._data = int(self._average.average(self._bridge_data))
        print(self._bridge_data)
        #self._pressure = float((self._bridge_data - _OUTPUT_MIN) * (_PRESSURE_MAX - _PRESSURE_MIN) / (_OUTPUT_MAX - _OUTPUT_MIN) + _PRESSURE_MIN)
        self._pressure = int((self._data - _OUTPUT_MIN) * (_PRESSURE_MAX - _PRESSURE_MIN) / (_OUTPUT_MAX - _OUTPUT_MIN) + _PRESSURE_MIN)
        return self._pressure

    @property
    def temperature(self):
        self._temperature_data = ((self._input_buffer[3] >> 5) | (self._input_buffer[2] << 3))
        self._temperature = (200.0 * self._temperature_data / 2047.0) - 50.0
        return self._temperature
    
    @property
    def status(self):
        self._status = ((self._input_buffer[0] & 0b11000000) >> 6)
        return self._status




