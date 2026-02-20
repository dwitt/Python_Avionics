#include "RollingAverageFilter.h"

RollingAverageFilter::RollingAverageFilter(int size, int resyncInterval)
    : size(size), index(0), count(0), sum(0.0f), updates(0), resyncInterval(resyncInterval)
{
    buffer = new float[size];
    for (int i = 0; i < size; i++) buffer[i] = 0.0f;
}

RollingAverageFilter::~RollingAverageFilter() {
    delete[] buffer;
}

void RollingAverageFilter::recomputeSum() {
    sum = 0.0f;
    for (int i = 0; i < count; i++) {
        sum += buffer[i];
    }
}

float RollingAverageFilter::update(float value) {
    sum -= buffer[index];
    buffer[index] = value;
    sum += value;

    index = (index + 1) % size;
    if (count < size) count++;

    updates++;
    if (updates >= resyncInterval) {
        recomputeSum();
        updates = 0;
    }

    return sum / count;
}

void RollingAverageFilter::reset() {
    for (int i = 0; i < size; i++) buffer[i] = 0.0f;
    sum = 0.0f;
    index = 0;
    count = 0;
    updates = 0;
}