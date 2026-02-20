#ifndef ROLLINGAVERAGEINT_H
#define ROLLINGAVERAGEINT_H

#include <Arduino.h>
#include <stdint.h>

class RollingAverageInt {
public:
  // Constructor: specify the number of data points
  RollingAverageInt(size_t size);

  // Destructor
  ~RollingAverageInt();

  // Add a value and return the updated rolling average
  int32_t add(int32_t value);

  // Optional: get current average without adding a new value
  int32_t getAverage() const;

private:
  int32_t* _values;
  size_t _size;
  size_t _index;
  size_t _count;
  int64_t _sum;
};

#endif // ROLLINGAVERAGEINT_H