#ifndef SMOOTH_DEADBAND_H
#define SMOOTH_DEADBAND_H

class SmoothDeadband {
public:
    SmoothDeadband(float deadband, float smoothing);
    
    // Update the filter with a new input value
    float update(float input);

    // Reset the output to a specific value
    void reset(float value = 0.0f);

    // Get the current output value
    float getOutput() const;

private:
    float _deadband;
    float _smoothing;
    float _output;
};

#endif // SMOOTH_DEADBAND_H