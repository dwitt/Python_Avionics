"""
Read Honeywell HSC pressure sensor over I2C
"""
# pyright: reportMissingImports=false
import board # pylint: disable=import-error
import busio # pylint: disable=import-error

from rolling_average import RollingAverage
from micropython import const # pylint: disable=import-error

# pressure sensor constants
_OUTPUT_MIN = const(1638)
_OUTPUT_MAX = const(14745)
_PRESSURE_MIN = const(0)
_PRESSURE_MAX = const(103421)


class HoneywellHSC:
    """Sensor Object"""

    def __init__(self, i2c, address = 0x028):
        self._address = address
        self._input_buffer = bytearray(4)
        self._i2c = i2c
        self._average = RollingAverage(120)

    def read_transducer(self):
        """Read data from the sensor"""
        _data_read = False
        try:
            self._i2c.try_lock()
            self._i2c.readfrom_into(self._address, self._input_buffer)
            _data_read = True
        finally:
            self._i2c.unlock()
        return _data_read

    @property
    def pressure(self):
        """Return the pressure after reading data from the sensor in Pa"""

        # Masking can be adjusted here to reduce the number of significant bits
        _bridge_data = (((self._input_buffer[0] & 0b00111111) << 8) |
                        self._input_buffer[1] & 0b11111111)
        #self._data = int(self._average.average(self._bridge_data))

        _pressure = int((_bridge_data - _OUTPUT_MIN) *
                        (_PRESSURE_MAX - _PRESSURE_MIN) /
                        (_OUTPUT_MAX - _OUTPUT_MIN) + _PRESSURE_MIN)
        return _pressure

    @property
    def temperature(self):
        """Return the temperature after reading data from the sensor"""
        _temperature_data = ((self._input_buffer[3] >> 5) | (self._input_buffer[2] << 3))
        _temperature = (200.0 * _temperature_data / 2047.0) - 50.0
        return _temperature

    @property
    def status(self):
        """Return the sensor's status after reading data from the sensor"""
        _status = ((self._input_buffer[0] & 0b11000000) >> 6)
        return _status
