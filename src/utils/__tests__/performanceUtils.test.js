import { calculateOverallAverage } from '../performanceUtils';

describe('calculateOverallAverage', () => {
  it('calculates average as total time divided by valid avgTime entries', () => {
    const data = [
      { system: 'A', avgTime: '00:01:05.000', files: 1 },
      { system: 'B', avgTime: '00:02:15.000', files: 99 },
      { system: 'C', avgTime: '00:00:30.000', files: 3 },
      { system: 'D', avgTime: '00:00:10.000', files: 10 },
    ];

    const result = calculateOverallAverage(data);

    // (65 + 135 + 30 + 10) / 4 = 60 sec => 00:01:00
    expect(result.totalEntries).toBe(4);
    expect(result.overallAvgTime).toBe('00:01:00');
  });

  it('rounds milliseconds in final HH:MM:SS output', () => {
    const data = [
      { system: 'A', avgTime: '00:05:03.699', files: 1 },
      { system: 'B', avgTime: '00:00:02.064', files: 1 },
    ];

    const result = calculateOverallAverage(data);

    // (303.699 + 2.064) / 2 = 152.8815 sec => 00:02:33 after rounding
    expect(result.totalEntries).toBe(2);
    expect(result.overallAvgTime).toBe('00:02:33');
  });

  it('skips malformed times and returns zero when nothing valid exists', () => {
    const result = calculateOverallAverage([
      { system: 'A', avgTime: 'bad-value', files: 5 },
      { system: 'B', avgTime: null, files: 1 },
    ]);

    expect(result.totalEntries).toBe(0);
    expect(result.overallAvgTime).toBe('00:00:00');
  });
});
