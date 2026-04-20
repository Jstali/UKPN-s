import { calculateOverallAverage } from '../performanceUtils';

describe('calculateOverallAverage', () => {
  it('calculates average as total time divided by total files', () => {
    const data = [
      { name: 'A', totalDuration: 65, files: 1 },   // 00:01:05
      { name: 'B', totalDuration: 135, files: 1 },  // 00:02:15
      { name: 'C', totalDuration: 30, files: 1 },   // 00:00:30
      { name: 'D', totalDuration: 10, files: 1 },   // 00:00:10
    ];

    const result = calculateOverallAverage(data);

    expect(result.totalFiles).toBe(4);
    expect(result.totalTimeMs).toBe(240000);
    expect(result.overallAvgTime).toBe('00:01:00.000');
  });

  it('supports avgTime values in seconds format', () => {
    const data = [
      { name: 'A', avgTime: '1.8s', files: 10 },
      { name: 'B', avgTime: '250ms', files: 2 },
    ];

    const result = calculateOverallAverage(data);

    // (1.8*10 + 0.25*2) / 12 = 1.541666... sec
    expect(result.totalFiles).toBe(12);
    expect(result.overallAvgTime).toBe('00:00:01.542');
  });
});
