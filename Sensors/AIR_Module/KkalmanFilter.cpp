#include "KalmanFilter.h"

KalmanFilter::KalmanFilter(float processNoise, float measurementNoise, float estimateError, float initialEstimate) {
  Q = processNoise;
  R = measurementNoise;
  P = estimateError;
  x_est = initialEstimate;
}

float KalmanFilter::update(float measurement) {
  // Predict step
  float x_pred = x_est;
  float P_pred = P + Q;

  // Update step
  K = P_pred / (P_pred + R);
  x_est = x_pred + K * (measurement - x_pred);
  P = (1 - K) * P_pred;

  return x_est;
}