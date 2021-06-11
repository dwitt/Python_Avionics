


class NPXPressureSensor:

    def __init__(self, i2c):
        self._i2c = i2c

        self._ads = ADS.ADS1115(i2c)
        self._ads.gain = 2/3
        self._ads.mode = ADS.Mode.SINGLE
        self._voltage_out_channel = AnalogIn(ads, ADS.P0)
        self._voltage_supply_channel = AnalogIn(ads, ADS.P1)

        self._supply_voltage = self._voltage_supply_channel.voltage
        self._supply_adc_count = self._voltage_supply_channel.value


    def read_pressure_channel(self):
        sensor_voltage = self._voltage_out_channel.voltage
        sensor_adc_count = self._voltage_out_channel.value

    @property
    def pressure(self):

