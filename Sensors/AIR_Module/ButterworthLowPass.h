#ifndef BUTTERWORTH_LOW_PASS_H
#define BUTTERWORTH_LOW_PASS_H

class ButterworthLowPass {
public:
    ButterworthLowPass();
    float process(float input); // Apply the filter
    void reset();               // Clear filter state

private:
    float x1, x2;
    float y1, y2;
};

#endif // BUTTERWORTH_LOW_PASS_H