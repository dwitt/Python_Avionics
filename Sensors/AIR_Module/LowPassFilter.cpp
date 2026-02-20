#include "LowPassFilter.h"

LowPassFilter::LowPassFilter(float alpha)
    : _alpha(alpha), _filteredValue(0.0f), _initialized(false) {}

float LowPassFilter::update(float input) {
    if (!_initialized) {
        _filteredValue = input;
        _initialized = true;
    } else {
        _filteredValue = _alpha * input + (1.0f - _alpha) * _filteredValue;
    }
    return _filteredValue;
}

float LowPassFilter::getValue() const {
    return _filteredValue;
}