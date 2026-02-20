#include "DeadbandFilter.h"
#include <cmath>

DeadbandFilter::DeadbandFilter(float deadband, float smoothing)
    : _deadband(deadband), _smoothing(smoothing), _output(0.0f) {}

float DeadbandFilter::update(float input) {
    float target = 0.0f;

    if (std::fabs(input) >= _deadband) {
        target = input;
    }

    // Smooth transition to the target
    _output += (target - _output) * _smoothing;

    return _output;
}

float DeadbandFilter::getOutput() const {
    return _output;
}