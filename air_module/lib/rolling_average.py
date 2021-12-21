import array

class RollingAverage:

    def __init__(self, number_of_points):
        self._number_of_points = number_of_points
        self._sum = 0
        self._data_array = array.array('i')
        self._index = 0
        self._array_filled = False
           
    def average(self, point):
        
        point = int(point)
        # add the point to the array and increment the pointer
        if (self._array_filled == False):
            self._data_array.append(point)
            self._sum = self._sum + point
            self._index = self._index + 1
            _average = self._sum / self._index
            if (self._index >= self._number_of_points):
                self._array_filled = True
                self._index = 0
        else:
            old_point = self._data_array[self._index]
            self._data_array[self._index] = point
            self._sum = self._sum - old_point + point
            self._index = self._index + 1
            _average = self._sum / self._number_of_points
            if self._index >= self._number_of_points:
                self._index = 0

        return _average
        