#ifndef KALMANFILTER_H
#define KALMANFILTER_H

class KalmanFilter {
public:
  KalmanFilter(float processNoise, float measurementNoise, float estimateError, float initialEstimate);

  float update(float measurement);

private:
  float Q;       // Process noise covariance
  float R;       // Measurement noise covariance
  float P;       // Estimate error covariance
  float K;       // Kalman gain
  float x_est;   // Estimated value
};

#endif