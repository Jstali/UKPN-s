// Status and event-type detection utilities.
// Used by the Failed Files pages to identify which audit records represent failures.
// Centralised here so that DTC and Non-DTC pages use identical failure logic.

import { mapNonDtcStatus } from '../constants/eventTypes';

// Normalise a status string for case-insensitive comparison
const normalizeStatus = (status) => String(status || '').toLowerCase().trim();

// "Duplicate Checksum" is excluded from failure detection —
// it looks like a failure but is a legitimate deduplication event (not an error).
export const isDuplicateChecksumStatus = (status) => normalizeStatus(status) === 'duplicate checksum';

// Event type codes that unconditionally represent a failed file transfer.
// These apply to both DTC and Non-DTC.
//   0 = Invalid Structure     (file format is wrong)
//   5 = Invalid Path          (destination path does not exist)
//   6 = App Inactive          (destination application is offline)
//   8 = Checksum Mismatch     (file was corrupted in transit)
//   9 = Delivery Failed to NetApp  (NetApp write failed)
//  21 = Duplicate             (file already received)
export const FAILED_EVENT_TYPES = new Set(['0', '5', '6', '8', '9', '21']);

// Returns true if the given Event_Type code represents a failure
export const isFailedEventType = (eventType) =>
  FAILED_EVENT_TYPES.has(String(eventType ?? ''));

// Returns true if a DTC event's Status string represents a failure.
// Only "Failed" and "Checksum Mismatch" are treated as DTC failures.
// "Duplicate Checksum" is explicitly excluded (legitimate dedup, not a failure).
export const isDtcFailedStatus = (status) => {
  const normalized = normalizeStatus(status);
  if (!normalized || isDuplicateChecksumStatus(normalized)) return false;
  return normalized === 'failed' || normalized === 'checksum mismatch';
};

// Returns true if a Non-DTC event's status string represents a failure.
// Uses broad keyword matching because SAP PI generates many different failure
// status strings (e.g. "DELIVERY_FAILED", "MessageRejected", "ProcessingError").
// "Invalid Subscription" is explicitly excluded — it means the file was sent to
// a party that hasn't subscribed, which is a normal business event, not a failure.
export const isNonDtcFailedStatus = (status) => {
  const normalized = normalizeStatus(mapNonDtcStatus(status));  // resolve numeric codes first
  if (!normalized || isDuplicateChecksumStatus(normalized)) return false;
  if (normalized === 'invalid subscription') return false;       // explicitly excluded
  // Broad pattern match covering all SAP PI failure terminology variants
  return (
    normalized.includes('fail') ||          // failed, failure, delivery_failed
    normalized.includes('invalid') ||       // invalid structure, invalid path
    normalized.includes('error') ||         // processing error, error
    normalized.includes('reject') ||        // rejected, rejection, MessageRejected
    normalized.includes('mismatch') ||      // checksum mismatch
    normalized.includes('exception') ||     // exception, system exception
    normalized.includes('not deliver') ||   // not delivered
    normalized.includes('not process') ||   // not processed
    normalized.includes('cancel') ||        // cancelled, cancellation
    normalized.includes('abort') ||         // aborted
    normalized.includes('suspend') ||       // suspended
    normalized.includes('timeout') ||       // timeout
    normalized.includes('timed out')        // timed out
  );
};

// Returns true if a Non-DTC RECORD (not just an event) represents a failure.
// Checks both the top-level status AND individual events because:
// - Some records have a "Success" top-level status but contain failed sub-events
// - The failure may be expressed as either a status string OR an event type code
export const isNonDtcFailedRecord = (item) => {
  if (!item) return false;
  // Check top-level status first
  if (isNonDtcFailedStatus(item.status) || isNonDtcFailedStatus(item.Status)) return true;
  // If top-level is OK, check each individual event
  const events = Array.isArray(item.events) ? item.events : [];
  return events.some((e) =>
    isNonDtcFailedStatus(e?.status) ||
    isNonDtcFailedStatus(e?.Status) ||
    isFailedEventType(e?.Event_Type) ||
    isFailedEventType(e?.eventType)
  );
};
