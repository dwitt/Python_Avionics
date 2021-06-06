class KalmanFilter:

    def __init__(self, q, r, x):
        self._q = q     # covariance of "process noise"
        self._r = r     # covariance of observation noise - or measurement
                        #  uncertainty or Variance (sigma squared)
        self._x = x     # initial state
        
        self._p = 0     # initialize internal variables
        self._k = 0     # initialize internal variables

    def filter(self,value):
        # covraince extrapolation
        # (for constant dynamics)
        # this means steady state which isn't exactly what we have
        self._p = self._p + self._q

        # kalman gain
        self._k = self._p / (self._p + self._r)

        # state update equation
        self._x = self._x + self._k * (value - self._x)
        
        # Note: not state extrapolation as we are using constant
        # velocity dynamics

        # estimate uncertainty update
        self._p = (1 - self._k) * self._p

        return self._x