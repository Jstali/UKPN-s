import { mapNonDtcStatus } from '../constants/eventTypes';

const normalizeStatus = (status) => String(status || '').toLowerCase().trim();

export const isDuplicateChecksumStatus = (status) => normalizeStatus(status) === 'duplicate checksum';

// Event types that represent a failed file (covers both DTC and Non-DTC)
export const FAILED_EVENT_TYPES = new Set(['0', '5', '6', '8', '9', '21']);

export const isFailedEventType = (eventType) =>
  FAILED_EVENT_TYPES.has(String(eventType ?? ''));

export const isDtcFailedStatus = (status) => {
  const normalized = normalizeStatus(status);
  if (!normalized || isDuplicateChecksumStatus(normalized)) return false;
  return normalized === 'failed' || normalized === 'checksum mismatch';
};

export const isNonDtcFailedStatus = (status) => {
  const normalized = normalizeStatus(mapNonDtcStatus(status));
  if (!normalized || isDuplicateChecksumStatus(normalized)) return false;
  // Broad pattern match to cover all SAP PI failure terminology
  return (
    normalized.includes('fail') ||          // failed, failure
    normalized.includes('invalid') ||
    normalized.includes('error') ||
    normalized.includes('reject') ||        // rejected, rejection
    normalized.includes('mismatch') ||
    normalized.includes('exception') ||
    normalized.includes('not deliver') ||   // not delivered
    normalized.includes('not process') ||   // not processed
    normalized.includes('cancel') ||        // cancelled, cancellation
    normalized.includes('abort') ||         // aborted
    normalized.includes('suspend') ||       // suspended
    normalized.includes('timeout') ||       // timeout
    normalized.includes('timed out')        // timed out
  );
};

export const isNonDtcFailedRecord = (item) => {
  if (!item) return false;
  if (isNonDtcFailedStatus(item.status) || isNonDtcFailedStatus(item.Status)) return true;

  const events = Array.isArray(item.events) ? item.events : [];
  return events.some((e) =>
    isNonDtcFailedStatus(e?.status) ||
    isNonDtcFailedStatus(e?.Status) ||
    isFailedEventType(e?.Event_Type) ||
    isFailedEventType(e?.eventType)
  );
};

