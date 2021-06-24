import board
import busio

import adafruit_ADS1x15.ads1115 as ADS
from adafruit_ads1x15.analog_in import AnalogIn

# pressure sensor constants
_P_MULTIPLIER = 0.1533
_OFFSET = 0.053

_M = 6523.1
_B = 345.7

class NPXPressureSensor:

    def __init__(self, i2c):
        self._i2c = i2c

        # ---------------------------------------------------------------------
        # --- create the A to D object to read the voltage from the sensor  ---
        # ---------------------------------------------------------------------
        
        self._ads = ADS.ADS1115(i2c)
        
        # --- setup the A to D                                              ---
        self._ads.gain = 2/3
        # TODO: consider switching to CONTINUOUS as this should provide faster results
        self._ads.mode = ADS.Mode.SINGLE   
        self._voltage_measured_channel = AnalogIn(self._ads, ADS.P0)
        self._voltage_supply_channel = AnalogIn(self._ads, ADS.P1)

        # --- on initialization assume that the pressure is zero            ---
        # --- read the current pressure and use it to zero the sensor       ---
        # --- perform a sanity check in case things go crazy                ---
        
        vo_count = self._voltage_measured_channel.value
        vs_count = self._voltage_supply_channel.value
        
        if (vo_count < 3242):
            # --- voltage is low enough to accept it as representing zero   ---
            # --- diferential pressure
            # --- use count for 0.378 volts + 5% Vfss or .230 volts
            # --- equals 0.608 volts
            # --- Actual could be higher if Vs is greater than 5.0 volts
            # TODO: Caclulate an assumed speed later just to know what it is---
            self._zero_pressure = _M * (vo_count / vs_count) + _B

        self._ads.mode = ADS.Mode.CONTINUOUS


        # --- read the supply voltage. needed for the pressure conversion
        self._supply_voltage = self._voltage_supply_channel.voltage
        self._supply_adc_count = self._voltage_supply_channel.value
        
        # --- zero the sums used for oversampling
        # TODO: Consider removing the oversampling
        self._sensor_voltage_sum = 0
        self._sensor_adc_count_sum = 0
        self._read_count = 0


    def read_pressure_channel_voltage(self):
        sensor_voltage = self._voltage_measured_channel.voltage
        return sensor_voltage
    
    def read_pressure_channel_count(self):
        sensor_adc_count = self._voltage_measured_channel.value
        return sensor_adc_count
    
    def read_pressure_channel_and_sum(self):
        self._sensor_voltage_sum = (self._sensor_voltage_sum +
                               self._voltage_measured_channel.voltage)
        self._sensor_adc_count_sum = (self._sensor_adc_count_sum +
                                     self._voltage_measured_channel.value)
        self._read_count = self._read_count + 1
        
    @property
    def count(self):
        return self._read_count
    
    def voltage_and_count(self):
        average_voltage = self._sensor_voltage_sum / self._read_count
        self._sensor_voltage_sum = 0
        average_count = self._sensor_adc_count_sum / self._read_count
        self._sensor_adc_count_sum = 0
        self._read_count = 0
        return(average_voltage, average_count)

    
    @property
    def pressure(self):
        vo_count = self._voltage_measured_channel.value
        vs_count = self._voltage_supply_channel.value
        _pressure = _M * (vo_count / vs_count) + _B  - self._zero_pressure
        return _pressure
    
    