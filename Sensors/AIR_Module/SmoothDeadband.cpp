#include "SmoothDeadband.h"
#include <cmath>

SmoothDeadband::SmoothDeadband(float deadband, float smoothing)
    : _deadband(deadband), _smoothing(smoothing), _output(0.0f) {}

float SmoothDeadband::update(float input) {
    float error = input - _output;

    if (std::fabs(error) < _deadband) {
        // Inside deadband — ignore
        return _output;
    }

    // Outside deadband — apply smoothing
    _output += error * _smoothing;
    return _output;
}

void SmoothDeadband::reset(float value) {
    _output = value;
}

float SmoothDeadband::getOutput() const {
    return _output;
}