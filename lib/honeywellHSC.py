
import board
import busio

from micropython import const 

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
        self._bridge_data = (((self._input_buffer[0] & 0b00111111) << 8) | self._input_buffer[1])
        self._pressure = float((self._bridge_data - _OUTPUT_MIN) * (_PRESSURE_MAX - _PRESSURE_MIN) / (_OUTPUT_MAX - _OUTPUT_MIN) + _PRESSURE_MIN)
        return self._pressure

    @property
    def temperature(self):
        self._temperature_data = ((self._input_buffer[3] >> 5) | (self._input_buffer[2] << 3))
        self._temperature = (200.0 * self._temperature_data / 2047.0) - 50.0
        return self._temperature




