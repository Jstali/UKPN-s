const normalizeStatus = (status) => String(status || '').toLowerCase().trim();

export const isDuplicateChecksumStatus = (status) => normalizeStatus(status) === 'duplicate checksum';

export const isDtcFailedStatus = (status) => {
  const normalized = normalizeStatus(status);
  if (!normalized || isDuplicateChecksumStatus(normalized)) return false;
  return normalized === 'failed' || normalized === 'invalid subscription' || normalized === 'checksum mismatch';
};

export const isNonDtcFailedStatus = (status) => {
  const normalized = normalizeStatus(status);
  if (!normalized || isDuplicateChecksumStatus(normalized)) return false;
  return (
    normalized.includes('failed') ||
    normalized.includes('invalid') ||
    normalized.includes('error') ||
    normalized.includes('rejected') ||
    normalized.includes('mismatch') ||
    normalized.includes('exception')
  );
};

export const isNonDtcFailedRecord = (item) => {
  if (!item) return false;
  if (isNonDtcFailedStatus(item.status) || isNonDtcFailedStatus(item.Status)) return true;

  const events = Array.isArray(item.events) ? item.events : [];
  return events.some((e) => isNonDtcFailedStatus(e?.status) || isNonDtcFailedStatus(e?.Status));
};

