import array

class Regression:
    
    def __init__(self, number_of_points):
        self._number_of_points = number_of_points
        self._data_array_altitude = array.array('i')
        self._data_array_time = array.array('i')
        self._index = 0
        self._arrays_filled = False
        
    def save_point(self, altitude, time):
        _altitude = int(altitude)
        _time = int(time)
        
        # add the points to the arrays and increment the pointer
        if (self._arrays_filled == False):
            self._data_array_altitude.append(_altitude)
            self._data_array_time.append(_time)
            self._index += 1
            if (self._index >= self._number_of_points):
                self._arrays_filled = True
                self._index = 0
        else:
            self._data_array_altitude[self._index] = _altitude
            self._data_array_time[self._index] = _time
            self._index += 1
            if (self._index >= self._number_of_points):
                self._index = 0
            
    def slope(self):
        if self._arrays_filled:
            _time_offset = self._data_array_time[0]
            for i in range(self._number_of_points):
                if (_time_offset > self._data_array_time[i]):
                    _time_offset = self._data_array_time[i]
            
            _altitude_sum = 0
            _time_sum = 0
            _time_squared_sum = 0
            _time_altitude_sum = 0
            
            for i in range(self._number_of_points):
                _altitude_sum += self._data_array_altitude[i]
                _time_sum += self._data_array_time[i] - _time_offset
                _time_squared_sum += ((self._data_array_time[i] - _time_offset) *
                                    (self._data_array_time[i] - _time_offset))
                _time_altitude_sum += ((self._data_array_time[i] - _time_offset) *
                                    self._data_array_altitude[i])
            
            _slope = ((self._number_of_points * _time_altitude_sum - 
                    _time_sum * _altitude_sum) * 60000 / 
                    (self._number_of_points * _time_squared_sum - 
                    _time_sum * _time_sum))
        else:
            _slope = 0
        
        return(_slope) 