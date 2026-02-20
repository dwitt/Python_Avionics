#include "ButterworthLowPass.h"

// Coefficients for 2nd-order Butterworth low-pass filter
// Sample rate = 100 Hz, Cutoff = 5 Hz
const float a0 = 0.067455;
const float a1 = 0.134911;
const float a2 = 0.067455;
const float b1 = -1.14298;
const float b2 = 0.41280;

ButterworthLowPass::ButterworthLowPass()
  : x1(0.0), x2(0.0), y1(0.0), y2(0.0) {}

float ButterworthLowPass::process(float input) {
    float output = a0 * input + a1 * x1 + a2 * x2
                             - b1 * y1 - b2 * y2;

    // Shift states
    x2 = x1;
    x1 = input;
    y2 = y1;
    y1 = output;

    return output;
}

void ButterworthLowPass::reset() {
    x1 = x2 = 0.0;
    y1 = y2 = 0.0;
}