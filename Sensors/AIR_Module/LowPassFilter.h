#ifndef LOWPASSFILTER_H
#define LOWPASSFILTER_H

class LowPassFilter {
public:
    LowPassFilter(float alpha);

    float update(float input);
    float getValue() const;

private:
    float _alpha;
    float _filteredValue;
    bool _initialized;
};

#endif