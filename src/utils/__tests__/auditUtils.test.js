import { parseHeader } from '../auditUtils';

describe('parseHeader', () => {
  it('maps all fields to correct pipe positions', () => {
    const result = parseHeader('ZHV|D0132001|X|FMPID|R|TMPID|%|TR01');
    expect(result).toEqual({
      flowVersion: 'D0132001',
      fromRole:    'X',
      fromMPID:    'FMPID',
      toRole:      'R',
      toMPID:      'TMPID',
      recApp:      '%',
    });
  });

  it('returns empty strings for empty input', () => {
    const result = parseHeader('');
    expect(result.fromMPID).toBe('');
    expect(result.toMPID).toBe('');
  });

  it('returns empty strings for UNKNOWN sentinel', () => {
    const result = parseHeader('UNKNOWN');
    expect(result.fromMPID).toBe('');
    expect(result.toMPID).toBe('');
  });
});
