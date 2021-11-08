"""Interface for NXP Analog Differential Pressure transducers"""
import time
#import board

from analogio import AnalogIn

class NPXPressureSensor:
    """ NPX Differential Presser Sensor with analog output"""

    def __init__(self, sensor_voltage_pin, system_voltage_pin, m, b,
                 debug = False):

        # calculate the transfer function parameters to provide pressuer in
        # Pa from the voltages

        self._m_prime = 1000 / m
        self._b_prime = -1000 * b / m

        # ---------------------------------------------------------------------
        # --- assign the analog input pins for the voltages to be measured  ---
        # ---------------------------------------------------------------------

        self._voltage_measured_channel = AnalogIn(sensor_voltage_pin)
        self._voltage_supply_channel = AnalogIn(system_voltage_pin)

        # ---------------------------------------------------------------------
        # --- calculate and save the zero pressure offset                   ---
        # ---------------------------------------------------------------------

        self.zero_offset(debug)

    def zero_offset(self, debug = False):
        """Calculate and save sensor offset at zero pressure"""

        # --- on initialization assume that the pressure is zero            ---
        # --- read the current pressure and use it to zero the sensor       ---
        # --- perform a sanity check in case things go crazy                ---

        _sample_counter = 0
        _pressure_total = 0

        time.sleep(5)

        _samples_to_average = 24

        while True:

            _vo_count = self._voltage_measured_channel.value
            _vs_count = self._voltage_supply_channel.value

            if _vo_count < 7546:
            # --- voltage is low enough to accept it as representing zero   ---
            # --- diferential pressure
            # --- max voltage for minimum pressure from spec sheet
            # --- for MP3V5010 is 0.38

                _pressure = (self._m_prime * (_vo_count / _vs_count) +
                             self._b_prime)
                _pressure_total = _pressure_total + _pressure
                _sample_counter = _sample_counter + 1

                if _sample_counter > _samples_to_average:
                    self._zero_pressure = _pressure_total / _sample_counter
                    break

            else:
                if debug:
                    print("Count is",_vo_count)

    @property
    def pressure(self):
        """Sample the voltages and return the current pressure reading"""
        _vo_count = self._voltage_measured_channel.value
        _vs_count = self._voltage_supply_channel.value
        _pressure = (self._m_prime * (_vo_count / _vs_count)
                     + self._b_prime  - self._zero_pressure)
        return _pressure
    