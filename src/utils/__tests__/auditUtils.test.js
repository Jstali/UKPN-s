import { parseHeader, pick, pickField } from '../auditUtils';

describe('parseHeader', () => {
  it('returns empty fields for UNKNOWN or falsy input', () => {
    expect(parseHeader('')).toEqual({
      flowVersion: '', fileId: '', fromRole: '', fromMPID: '', toRole: '', toMPID: '', recApp: '',
    });
    expect(parseHeader('UNKNOWN')).toEqual({
      flowVersion: '', fileId: '', fromRole: '', fromMPID: '', toRole: '', toMPID: '', recApp: '',
    });
  });

  // Asymmetric header makes the index bug visible — fromMPID and toMPID must
  // come from indexes 3 and 5 respectively, not the other way round.
  it('parses an asymmetric 8-part header without swapping MPIDs', () => {
    const parsed = parseHeader('ZHV|M0003001|R|EELC|R|LOND|CRM|TR01');
    expect(parsed).toEqual({
      flowVersion: 'M0003001',
      fromRole:    'R',
      fromMPID:    'EELC',
      toRole:      'R',
      toMPID:      'LOND',
      recApp:      'TR01',
    });
  });

  it('parses the bug-report header without losing recApp', () => {
    const parsed = parseHeader('ZHV|D0010002|D|LOND|R|LOND|UNKNOWN|TR01');
    expect(parsed.fromMPID).toBe('LOND');
    expect(parsed.toMPID).toBe('LOND');
    expect(parsed.recApp).toBe('TR01');
  });
});

describe('pick', () => {
  it('returns the first truthy, non-UNKNOWN value', () => {
    expect(pick('', null, 'UNKNOWN', 'value', 'other')).toBe('value');
    expect(pick(null, undefined, '')).toBe('');
  });
});

describe('pickField', () => {
  const record = { flow: '', Flow: 'D001', version: null };

  it('returns the first non-empty value across candidate keys', () => {
    expect(pickField(record, 'flow', 'Flow')).toBe('D001');
  });

  it('returns empty string when all candidates are empty / missing', () => {
    expect(pickField(record, 'version', 'Version', 'missing')).toBe('');
    expect(pickField(null, 'anything')).toBe('');
  });
});
