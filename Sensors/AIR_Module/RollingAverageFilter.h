#ifndef ROLLING_AVERAGE_FILTER_H
#define ROLLING_AVERAGE_FILTER_H

class RollingAverageFilter {
public:
    RollingAverageFilter(int size, int resyncInterval = 256);
    ~RollingAverageFilter();

    float update(float value);
    void reset();

private:
    float* buffer;
    int size;
    int index;
    int count;
    float sum;
    int updates;
    int resyncInterval;

    void recomputeSum();
};

#endif
