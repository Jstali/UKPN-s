// Event flattening utilities for DTC and Non-DTC audit data.
// Each audit record from the API contains a nested `events` array (the log).
// These functions produce one flat row per event so DataTable can render them uniformly.
// This is the central data-transformation layer — all pages read from these outputs.

import { parseHeader, formatDateTime, formatFlowVersion, pick, deriveFlowVersion } from './auditUtils';
import { resolveNonDtcEventType, mapStatusDisplay, mapNonDtcStatus, DTC_EVENT_TYPES_WITH_DESTINATION, DTC_EVENT_TYPE_MAP } from '../constants/eventTypes';
import { applyDtcFilters } from './dtcFilterUtils';
import { getNonDtcBlobPath, getNonDtcDisplayDestPath } from './blobPathUtils';

// ─── Shared helpers ────────────────────────────────────────────────────────

// Corrects known application name casing/formatting issues from the API.
// The API returns names like "Electralink" or "Grey_IT" which need to be
// corrected to their proper display values before they appear in the table.
// To add a new correction: add a lowercase key → correct display value entry.
const APP_NAME_MAP = {
  'electralink':  'ElectraLink',   // API returns lowercase 'l' — correct to capital 'L'
  'grey_it':      'IM Grey IT',    // API returns underscore-separated — correct to readable label
  'im_greyit':    'IM Grey IT',    // Alternate API serialisation of the same application
};
const normalizeAppName = (name) => {
  if (!name) return name;
  // Look up the lowercase version in the map; fall back to original if not found
  return APP_NAME_MAP[String(name).toLowerCase()] ?? name;
};

// Resolves a boolean/string "processed" field from multiple candidates.
// Different API serialisers use different field names and types for this field.
const resolveProcessed = (...candidates) => {
  for (const c of candidates) {
    if (c === true || c === false) return String(c);   // native boolean → "true"/"false"
    if (c === null || c === undefined) continue;
    const s = String(c).trim();
    if (s && s.toLowerCase() !== 'unknown') return s;  // skip "unknown" placeholders
  }
  return '';
};

// ─── DTC ─────────────────────────────────────────────────────────────────

// Produces one flat row per event from a single DTC audit record.
// The raw record has one file with N events (its lifecycle log).
// Output: N rows, each containing all file-level fields plus the specific event's fields.
const flattenDtcItem = (item) => {
  const parsed   = parseHeader(item.Header_String);   // extract flow, roles, MPIDs from pipe-delimited header
  const events   = item.events || [];
  if (!events.length) return [];                       // skip records with no events

  // Source application comes from the FIRST event — it identifies the originating system
  const sourceApplication = normalizeAppName(events[0]?.applicationName) || 'Unknown';

  // Pre-compute flow version once per record (same for all events in this record)
  const rawFlowVersion    = deriveFlowVersion(item, parsed.flowVersion);
  const formattedFV       = formatFlowVersion(rawFlowVersion) || '-';
  const [flow, version]   = formattedFV.split(' ');   // e.g. "D0132 001" → flow="D0132", version="001"

  // Resolve routing fields from header (multiple fallback field names for resilience)
  const fromRole = pick(parsed.fromRole, item.From_Role, item.from_role, item.fromRole);
  const fromMPID = pick(parsed.fromMPID, item.From_MPID, item.from_mpid, item.fromMPID);
  const toRole   = pick(parsed.toRole,   item.To_Role,   item.to_role,   item.toRole);
  const toMPID   = pick(parsed.toMPID,   item.To_MPID,   item.to_mpid,   item.toMPID);

  // Reverse events so the most recent event appears first in the table
  return [...events].reverse().reduce((rows, event) => {
    const eventStatus = event.Status || event.status || 'Unknown';

    // Skip "valid subscription" events — these are internal handshake events that
    // confirm a subscription exists. They are noise for the audit view.
    if (eventStatus.toLowerCase().trim() === 'valid subscription') return rows;

    // Skip event types explicitly mapped to null in DTC_EVENT_TYPE_MAP.
    // These are internal storage events (e.g. "File Store to Blob") that have
    // no business meaning and should not appear in the audit table.
    if (event.Event_Type in DTC_EVENT_TYPE_MAP && DTC_EVENT_TYPE_MAP[event.Event_Type] === null) return rows;

    // eventType column shows the actual Status from the API log (e.g. "Delivered", "Failed").
    // mapStatusDisplay normalises raw status strings
    // (e.g. "File Transfer" → "Delivered", "File Delivered" → "Net App Delivered").
    const eventType = mapStatusDisplay(eventStatus);

    // Destination application is only meaningful for specific event types.
    // For other event types (e.g. Archived, Published) there is no destination.
    const application = DTC_EVENT_TYPES_WITH_DESTINATION.has(String(event.Event_Type))
      ? normalizeAppName(event.applicationName || event.Destination_Application) || ''
      : '';

    rows.push({
      ...item,                              // spread all raw API fields (available for detail views/exports)
      id:                  item.id,
      flowVersion:         formattedFV,
      flow:                flow || '-',
      version:             version || '-',
      fileId:              item.id || '',
      // hFileId = the "human" file ID shown in the table; tries HFile_ID first, falls back through other variants
      hFileId:             pick(item.HFile_ID, item.hFile_ID, item.hfile_id, item.File_ID, item.fileId, item.file_id, item.correlationId) || item.id,
      fromRole,
      fromMPID,
      toRole,
      toMPID,
      recApp:              parsed.recApp,
      fileName:            item.Source_FileName,
      sourceApplication,                    // normalised source app name
      application,                          // normalised destination app name (only set for relevant event types)
      eventType,                            // actual status from log (not a hardcoded label)
      status:              mapStatusDisplay(eventStatus),
      processed:           resolveProcessed(event.processed, event.Processed, item.processed, item.Processed),
      timestamp:           event.timestamp || '',
      rawTimestamp:        event.timestamp || '',  // preserved for date comparisons in filters (not affected by formatting)
      eventId:             event.id || '',
      destinationPath:     event.Destination_Folder || event.netappfilepath || event.destinationfilepath || event.Destination_Path || event.destination_path || event.destinationPath || event.DestinationPath || '',
      destinationFileName: event['Destination File Name'] || event.Destination_fileName || event.Destination_FileName || event.Destination_file_name || event.destinationFileName || event.destinationfilename || event.DestinationFileName || '',
    });

    return rows;
  }, []);
};

// Flattens ALL DTC audit records into a single flat array (one row per event).
// Used for the default (unfiltered) DTC Audit table view.
export const flattenDtcAuditData = (data = []) =>
  data.flatMap(flattenDtcItem);

// Flattens + applies filters in one pass.
// Used by DtcAudit.jsx when the user clicks "Apply" on the filter panel.
// Splitting flatten and filter keeps each step independently testable.
export const buildFilteredDtcResults = (data = [], filters = {}) => {
  const flat = data.flatMap(flattenDtcItem);  // Step 1: flatten all records
  return applyDtcFilters(flat, filters);       // Step 2: apply active filter criteria
};

// ─── Non-DTC ──────────────────────────────────────────────────────────────

// Produces one flat row per event from a Non-DTC (SAP PI) audit record.
// Non-DTC records use different field names and a different structure than DTC.
export const flattenNonDtcAuditData = (data = []) => {
  const rows = [];

  (data || []).forEach(item => {
    // Treat records with no events array as having one empty event
    // so the record still appears in the table (file-level data only)
    const events         = item.events?.length ? item.events : [{}];
    const fileName       = item.sourceFileName || '';
    const fileType       = fileName ? fileName.split('.').pop().toUpperCase() : '-';  // derive extension from filename
    const blobPath       = item.blobArchiveLocation || getNonDtcBlobPath(item);
    const displayDestPath = getNonDtcDisplayDestPath(item);

    // Blob archive fields — try top-level item first, then event-level
    const itemBlobArchive  = item.Blob_Archive_Link_Location || item.blobArchiveLinkLocation || item.blob_archive_link_location || '';
    const itemBlobLocation = item.Blob_Location || item.blobLocation || item.blob_location || '';
    const itemBlobFileName = item.Blob_File_Name || item.blobFileName || item.blob_file_name || '';

    // Blob archive fields from the "File Stored To Blob" event (type 2)
    // This event captures where the file was written to blob storage
    const blobEvent      = events.find(e => String(e?.eventType || e?.event_type || e?.Event_Type || e?.EventType || '') === '2');
    const evtBlobArchive  = blobEvent?.Blob_Archive_Link_Location || blobEvent?.blobArchiveLinkLocation || '';
    const evtBlobLocation = blobEvent?.Blob_Location || blobEvent?.blobLocation || blobEvent?.storagePath || blobEvent?.StoragePath || blobEvent?.filePath || '';
    const evtBlobFileName = blobEvent?.Blob_File_Name || blobEvent?.blobFileName || blobEvent?.destinationContent || blobEvent?.DestinationContent || '';

    // For Non-DTC, the flow/subscription name comes from the type-3 "File Subscribe" event
    // (not from the header string like DTC — Non-DTC records don't have a Header_String)
    const subscriptionEvent = events.find(e => String(e?.eventType || e?.event_type || e?.Event_Type || e?.EventType || '') === '3');
    const flowValue = subscriptionEvent?.subscription || item.subscription || item.description || '-';

    // Meta fields — tried across multiple key variants because different SAP PI
    // serialisers produce differently-cased or -named fields
    const changeFeedStatus =
      item.changeFeedStatus   || item.ChangeFeedStatus   ||
      item.change_feed_status || item.changeFeed         || item.change_feed || '';
    const requestStatus =
      item.requestStatus   || item.RequestStatus   ||
      item.request_status  || item.reqStatus        || item.req_status || '';
    const processedTime =
      item.processedTime   || item.ProcessedTime   ||
      item.processed_time  || item.processTime     ||
      item.process_time    || item.processingTime  || item.processing_time || '';

    events.forEach(event => {
      // Resolve and normalise the event type label; skip null-mapped types (suppressed events)
      const resolvedEventType = resolveNonDtcEventType(Object.keys(event).length ? event : { eventType: item.eventType });
      if (resolvedEventType === null) return;  // skip suppressed event types

      rows.push({
        uniqueId:    item.id || '',
        flow:        flowValue,                              // subscription/flow name from type-3 event
        version:     item.version || item.subscription || '-',
        fileId:      item.id || '-',
        timestamp:   formatDateTime(event.timestamp || item.timestamp || ''),  // formatted as DD/MM/YYYY HH:MM:SS
        fromRole:    item.fromRole || '-',
        fromMPID:    item.fromMPID || '-',
        toRole:      item.toRole || '-',
        toMPID:      item.toMPID || '-',
        sourceApplication: normalizeAppName(item.sourceAppName) || '-',         // normalised source app
        application: normalizeAppName(event.destinationApplication || event.applicationName) || '',  // normalised destination
        status:      mapNonDtcStatus(event.status ?? event.Status ?? item.status ?? ''),  // numeric code → readable label
        fileType,
        fileName:    fileName || '-',
        sourceApp:   item.sourceAppName || item.subscription || '-',
        sourceFile:  fileName || '',
        subscription: item.subscription || '',
        sourcePath:  item.sourcePath || '',
        destinationPath: displayDestPath,
        _blobPath:   blobPath,
        // Blob fields: prefer event-level values (more specific), fall back to item-level
        Blob_Archive_Link_Location: itemBlobArchive || evtBlobArchive,
        Blob_Location:              itemBlobLocation || evtBlobLocation,
        Blob_File_Name:             itemBlobFileName || evtBlobFileName,
        Source_FileName:            fileName,
        changeFeedStatus,
        requestStatus,
        processedTime,
        lastUpdatedAt: item.lastUpdatedAt || item.LastUpdatedAt || item.last_updated_at || '',
        eventType: resolvedEventType,          // resolved Non-DTC event type label
        // startDate/endDate: first and last event timestamps for the record
        startDate: item.events?.[0]?.timestamp
          ? new Date(item.events[0].timestamp).toLocaleString('en-GB') : '',
        endDate: item.events?.[item.events.length - 1]?.timestamp
          ? new Date(item.events[item.events.length - 1].timestamp).toLocaleString('en-GB') : '',
        rawData: item,   // preserve full raw record for detail views and JSON export
      });
    });
  });

  return rows;
};
