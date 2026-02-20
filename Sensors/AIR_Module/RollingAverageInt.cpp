#include "RollingAverageInt.h"

RollingAverageInt::RollingAverageInt(size_t size)
  : _size(size), _index(0), _count(0), _sum(0) {
  _values = new int32_t[_size];
  for (size_t i = 0; i < _size; ++i) {
    _values[i] = 0;
  }
}

RollingAverageInt::~RollingAverageInt() {
  delete[] _values;
}

int32_t RollingAverageInt::add(int32_t value) {
  _sum -= _values[_index];           // Remove oldest value
  _values[_index] = value;           // Insert new value
  _sum += value;                     // Add new value
  _index = (_index + 1) % _size;     // Advance circular index
  if (_count < _size) {
    ++_count;
  }
  return _sum / _count;              // Return integer average
}

int32_t RollingAverageInt::getAverage() const {
  if (_count == 0) return 0;
  return _sum / _count;
}