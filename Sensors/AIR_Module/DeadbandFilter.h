#ifndef DEADBAND_FILTER_H
#define DEADBAND_FILTER_H

class DeadbandFilter {
public:
    // Constructor: deadband center at 0. smoothing [0.0 - 1.0]
    DeadbandFilter(float deadband, float smoothing = 1.0f);

    // Update with a new differential pressure value (in hPa)
    float update(float input);

    // Get the current filtered output
    float getOutput() const;

private:
    float _deadband;
    float _smoothing;
    float _output;
};

#endif // DEADBAND_FILTER_H