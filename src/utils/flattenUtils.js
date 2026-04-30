// Event flattening utilities for DTC and Non-DTC audit data.
// Each audit record from the API contains a nested `events` array (the log).
// These functions produce one flat row per event so DataTable can render them uniformly.
// This is the central data-transformation layer — all pages read from these outputs.

import { parseHeader, formatDateTime, formatFlowVersion, pick, deriveFlowVersion } from './auditUtils';
import { mapNonDtcStatus, getEventStatusValue } from '../constants/eventTypes';
import { applyDtcFilters } from './dtcFilterUtils';
import { getNonDtcBlobPath, getDisplayDestPath, getDisplaySourcePath } from './blobPathUtils';

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
// Exported so the Non-DTC detail view can show the same normalised app names
// the main DTC and Non-DTC tables show, without duplicating the lookup table.
export const normalizeAppName = (name) => {
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

// Joins parts with a single space, trimming each and dropping blanks. Used by the
// Business-role view to render combined fields (e.g. "3 SEEB" for From Role+MPID).
const joinSpace = (...parts) => parts.map(p => String(p ?? '').trim()).filter(Boolean).join(' ');

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

  // Source/Destination paths are file-level attributes — same shape as Non-DTC.
  // Computed once per file and applied to every event row of that file, so the
  // table shows a consistent path for the file across all its event rows.
  const fileSourcePath      = getDisplaySourcePath(item);
  const fileDestinationPath = getDisplayDestPath(item);

  // Reverse events so the most recent event appears first in the table
  return [...events].reverse().reduce((rows, event) => {
    if (!event || typeof event !== 'object') return rows; // skip null/corrupt events
    // Event Type column shows the raw Status text for that event
    // (e.g. "Publish", "Valid Subscription", "Subscribed", "File Delivered",
    // "File Transferred"). One row per event from events[].
    const eventStatus = getEventStatusValue(event) || 'Unknown';
    const eventType = eventStatus;

    // Destination column is populated whenever the event itself carries
    // destination data in the log (any of the destination-marker fields below).
    // We do NOT gate this on Event_Type — any event with destination data shows it,
    // and events without destination data leave the column blank.
    const rawEventType = String(event.Event_Type ?? event.event_type ?? event.eventType ?? event.EventType ?? '');
    const isDestByEventType = rawEventType === '32' || rawEventType === '33';
    const hasDestinationData = !!(
      event.Destination_Application ||
      event['Destination Folder']    || event.Destination_Folder ||
      event['Destination File Name'] || event.Destination_fileName || event.Destination_FileName || event.Destination_file_name ||
      event.Destination_Path         || event.destination_path || event.destinationPath || event.DestinationPath ||
      event.netappfilepath           || event.destinationfilepath ||
      event.destinationFileName      || event.destinationfilename || event.DestinationFileName
    );
    const application = (hasDestinationData || isDestByEventType)
      ? normalizeAppName(event.Destination_Application || event.applicationName) || ''
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
      fromRoleMPID:        joinSpace(fromRole, fromMPID),
      toRoleMPID:          joinSpace(toRole,   toMPID),
      recApp:              parsed.recApp,
      fileName:            item.Source_FileName,
      sourceApplication,                    // normalised source app name
      application,                          // normalised destination app name (only set for relevant event types)
      eventType,                            // actual status from log (not a hardcoded label)
      status:              eventStatus,
      processed:           resolveProcessed(event.processed, event.Processed, item.processed, item.Processed),
      timestamp:           event.timestamp || '',
      rawTimestamp:        event.timestamp || '',  // preserved for date comparisons in filters (not affected by formatting)
      eventId:             event.id || '',
      sourcePath:          fileSourcePath,
      destinationPath:     fileDestinationPath,
      destinationFileName: event['Destination File Name'] || event.Destination_fileName || event.Destination_FileName || event.Destination_file_name || event.destinationFileName || event.destinationfilename || event.DestinationFileName || '',
    });

    return rows;
  }, []);
};

const MAX_FLAT_ROWS = 20000;

// Flattens ALL DTC audit records into a single flat array (one row per event).
// Used for the default (unfiltered) DTC Audit table view.
export const flattenDtcAuditData = (data = []) => {
  const rows = [];
  for (const item of data) {
    for (const row of flattenDtcItem(item)) {
      rows.push(row);
      if (rows.length >= MAX_FLAT_ROWS) return rows;
    }
  }
  return rows;
};

// Flattens + applies filters in one pass.
// Used by DtcAudit.jsx when the user clicks "Apply" on the filter panel.
// Splitting flatten and filter keeps each step independently testable.
export const buildFilteredDtcResults = (data = [], filters = {}) => {
  const rows = [];
  for (const item of data) {
    for (const row of flattenDtcItem(item)) {
      rows.push(row);
      if (rows.length >= MAX_FLAT_ROWS) break;
    }
    if (rows.length >= MAX_FLAT_ROWS) break;
  }
  return applyDtcFilters(rows, filters);
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
    const displayDestPath = getDisplayDestPath(item);
    const displaySourcePath = getDisplaySourcePath(item);

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
      if (rows.length >= MAX_FLAT_ROWS) return;
      if (!event || typeof event !== 'object') return; // skip null/corrupt events
      // Event Type column = raw Status text for the event, matching DTC.
      // Falls back to description-style fields only when Status is absent
      // so older Non-DTC payloads that pre-date the Status field still render.
      const rawEventStatus =
        getEventStatusValue(event) ||
        event.description || event.Description ||
        event.eventType   || event.event_type  || event.Event_Type ||
        item.eventType    || '';

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
        sourcePath:  displaySourcePath,
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
        eventType: rawEventStatus,
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

// Shared Non-DTC table filtering used by both default and detail views.
// Keeps row-selection behavior identical across pages.
export const buildFilteredNonDtcResults = (rows = [], filters = {}) => {
  const matchesMultiSelect = (selectedValue, actualValue) => {
    if (!selectedValue || selectedValue === 'All') return true;
    return selectedValue
      .split(',')
      .map(v => v.trim())
      .filter(Boolean)
      .includes(actualValue);
  };

  let result = [...rows];
  result = result.filter(r => matchesMultiSelect(filters.flow, r.flow));
  result = result.filter(r => matchesMultiSelect(filters.sourceApp, r.sourceApp));
  result = result.filter(r => matchesMultiSelect(filters.destinationApp, r.application));
  result = result.filter(r => matchesMultiSelect(filters.eventType, r.eventType));
  result = result.filter(r => matchesMultiSelect(filters.fileId, r.fileId));
  return result;
};
