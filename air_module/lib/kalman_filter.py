"""Module containing kalman filter"""
class KalmanFilter:
    """Kalman Filter"""
    def __init__(self, q, r, x):

        # The covariances q and R do not change
        self._q = q     # covariance of "process noise"
        self._r = r     # covariance of observation noise - or "measurement"
                        # uncertainty or Variance (sigma squared)

        self._x = x     # initial state (measurement)

        self._p = 0     # covariance between x and x_hat
        self._k = 0     # kalman gain

    def filter(self,value):
        """Apply the kalman filter to the data point provided"""
        # all self._ values are from n-1


        # covraince extrapolation
        # (for constant dynamics)
        # this means steady state which isn't exactly what we have
        # Pn+1
        self._p = self._p + self._q

        # kalman gain
        # Kn
        self._k = self._p / (self._p + self._r)

        # state update equation
        # note: the new _x is called _x hat
        # Xn
        self._x = self._x + self._k * (value - self._x)

        # Note: not state extrapolation as we are using constant
        # velocity dynamics

        # estimate uncertainty update
        # Covariance Update
        #Pn
        self._p = (1 - self._k) * self._p

        return self._x
