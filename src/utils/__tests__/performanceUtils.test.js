import {
  calculateOverallAverage,
  calculateWeightedAverage,
  secondsToTime,
  timeToSeconds,
} from '../performanceUtils';

describe('performance weighted-average utils', () => {
  it('timeToSeconds parses HH:MM:SS.mmm accurately', () => {
    expect(timeToSeconds('00:05:03.699')).toBeCloseTo(303.699, 6);
    expect(timeToSeconds('00:00:02.064')).toBeCloseTo(2.064, 6);
    expect(timeToSeconds('bad')).toBeNull();
  });

  it('secondsToTime formats with milliseconds preserved', () => {
    expect(secondsToTime(303.699)).toBe('00:05:03.699');
    expect(secondsToTime(2.064)).toBe('00:00:02.064');
    expect(secondsToTime(-1)).toBe('00:00:00.000');
  });

  it('calculateWeightedAverage uses files as weights', () => {
    const data = [
      { system: 'Electralink', avgTime: '00:05:03.699', files: 996 },
      { system: 'Durabill', avgTime: '00:00:06.931', files: 3 },
      { system: 'APW', avgTime: '00:00:03.677', files: 1 },
      { system: 'ADMS', avgTime: '00:00:02.804', files: 1 },
      { system: 'MPRS', avgTime: '00:00:02.064', files: 6 },
    ];

    // Weighted result is ~300.420915s
    expect(calculateWeightedAverage(data)).toBe('00:05:00.421');
  });

  it('returns zero for empty/invalid/zero-files inputs', () => {
    expect(calculateWeightedAverage([])).toBe('00:00:00.000');
    expect(calculateWeightedAverage([
      { system: 'A', avgTime: 'bad-value', files: 5 },
      { system: 'B', avgTime: null, files: 1 },
    ])).toBe('00:00:00.000');
    expect(calculateWeightedAverage([
      { system: 'A', avgTime: '00:01:00.000', files: 0 },
    ])).toBe('00:00:00.000');
  });

  it('calculateOverallAverage returns dashboard-compatible shape', () => {
    const result = calculateOverallAverage([
      { system: 'A', avgTime: '00:00:10.000', files: 2 },
      { system: 'B', avgTime: '00:00:20.000', files: 1 },
    ]);
    expect(result.totalFiles).toBe(3);
    expect(result.overallAvgTime).toBe('00:00:13.333');
  });
});
