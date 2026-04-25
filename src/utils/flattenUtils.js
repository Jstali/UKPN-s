// Event flattening utilities for DTC and Non-DTC audit data.
// Each audit record contains a nested events array; these functions produce
// one flat row per event so DataTable can render them uniformly.

import { parseHeader, formatDateTime, formatFlowVersion } from './auditUtils';
import { resolveDtcEventType, resolveNonDtcEventType, mapStatusDisplay, mapNonDtcStatus, STATUSES_WITHOUT_DESTINATION } from '../constants/eventTypes';
import { applyDtcFilters } from './dtcFilterUtils';
import { getNonDtcBlobPath, getNonDtcDisplayDestPath } from './blobPathUtils';

// ─── Shared helpers ────────────────────────────────────────────────────────

// Returns the first non-empty, non-"UNKNOWN" value from a list of candidates.
const pick = (...candidates) => candidates.find(v => v && v !== 'UNKNOWN') || '';

const normalizeVersion = (value) => {
  const str = String(value || '').trim();
  if (!str) return '';
  return /^\d+$/.test(str) ? str.padStart(3, '0') : str;
};

// Derives the flow+version string from an item and its parsed header value.
const deriveFlowVersion = (item, parsedFlowVersion) => {
  const direct =
    parsedFlowVersion || item.Flow_Version || item.flow_version ||
    item.flowVersion  || item.flow || '';
  if (direct) return direct;

  const flowOnly    = item.Flow || item.flow || '';
  const versionOnly = normalizeVersion(item.Version || item.version || '');
  if (flowOnly && versionOnly) return `${flowOnly} ${versionOnly}`;
  return flowOnly;
};

// Resolves a boolean/string "processed" field from multiple candidates.
const resolveProcessed = (...candidates) => {
  for (const c of candidates) {
    if (c === true || c === false) return String(c);
    if (c === null || c === undefined) continue;
    const s = String(c).trim();
    if (s && s.toLowerCase() !== 'unknown') return s;
  }
  return '';
};

// ─── DTC ─────────────────────────────────────────────────────────────────

// Produces one flat row per event from a DTC audit record.
const flattenDtcItem = (item) => {
  const parsed   = parseHeader(item.Header_String);
  const events   = item.events || [];
  if (!events.length) return [];

  const sourceApplication = events[0]?.applicationName || 'Unknown';
  const rawFlowVersion    = deriveFlowVersion(item, parsed.flowVersion);
  const formattedFV       = formatFlowVersion(rawFlowVersion) || '-';
  const [flow, version]   = formattedFV.split(' ');

  const fromRole = pick(parsed.fromRole, item.From_Role, item.from_role, item.fromRole);
  const fromMPID = pick(parsed.fromMPID, item.From_MPID, item.from_mpid, item.fromMPID);
  const toRole   = pick(parsed.toRole,   item.To_Role,   item.to_role,   item.toRole);
  const toMPID   = pick(parsed.toMPID,   item.To_MPID,   item.to_mpid,   item.toMPID);

  return [...events].reverse().reduce((rows, event) => {
    const eventStatus = event.Status || event.status || 'Unknown';

    // Skip "valid subscription" noise events
    if (eventStatus.toLowerCase().trim() === 'valid subscription') return rows;

    const eventType = resolveDtcEventType(event);
    // Skip event types mapped to null (e.g. "File Store to Blob")
    if (eventType === null) return rows;
    const application = STATUSES_WITHOUT_DESTINATION.has(eventStatus.toLowerCase().trim())
      ? ''
      : (event.applicationName || event.Destination_Application || '');

    rows.push({
      ...item,
      id:                  item.id,
      flowVersion:         formattedFV,
      flow:                flow || '-',
      version:             version || '-',
      fileId:              item.id || '',
      hFileId:             pick(item.HFile_ID, item.hFile_ID, item.hfile_id, item.File_ID, item.fileId, item.file_id, item.correlationId) || item.id,
      fromRole,
      fromMPID,
      toRole,
      toMPID,
      recApp:              parsed.recApp,
      fileName:            item.Source_FileName,
      sourceApplication,
      application,
      eventType,
      status:              mapStatusDisplay(eventStatus),
      processed:           resolveProcessed(event.processed, event.Processed, item.processed, item.Processed),
      timestamp:           event.timestamp || '',
      rawTimestamp:        event.timestamp || '',
      eventId:             event.id || '',
      destinationPath:     event.Destination_Path || '',
      destinationFileName: event.Destination_fileName || '',
    });

    return rows;
  }, []);
};

// Flattens all DTC audit records into one row-per-event array.
export const flattenDtcAuditData = (data = []) =>
  data.flatMap(flattenDtcItem);

// Flattens + applies filters in one pass (used by DtcAudit handleQuery).
export const buildFilteredDtcResults = (data = [], filters = {}) => {
  const flat = data.flatMap((item) => {
    const rows = flattenDtcItem(item);
    return rows.map(row => ({ ...row, created: formatDateTime(row.timestamp) }));
  });
  return applyDtcFilters(flat, filters);
};

// ─── Non-DTC ──────────────────────────────────────────────────────────────

// Produces one flat row per event from a Non-DTC audit record.
export const flattenNonDtcAuditData = (data = []) => {
  const rows = [];

  (data || []).forEach(item => {
    const events         = item.events?.length ? item.events : [{}];
    const fileName       = item.sourceFileName || '';
    const fileType       = fileName ? fileName.split('.').pop().toUpperCase() : '-';
    const blobPath       = item.blobArchiveLocation || getNonDtcBlobPath(item);
    const displayDestPath = getNonDtcDisplayDestPath(item);

    // Blob archive fields from top-level item
    const itemBlobArchive  = item.Blob_Archive_Link_Location || item.blobArchiveLinkLocation || item.blob_archive_link_location || '';
    const itemBlobLocation = item.Blob_Location || item.blobLocation || item.blob_location || '';
    const itemBlobFileName = item.Blob_File_Name || item.blobFileName || item.blob_file_name || '';

    // Blob archive fields from the "File Stored To Blob" (type 2) event
    const blobEvent      = events.find(e => String(e?.eventType || e?.event_type || e?.Event_Type || e?.EventType || '') === '2');
    const evtBlobArchive  = blobEvent?.Blob_Archive_Link_Location || blobEvent?.blobArchiveLinkLocation || '';
    const evtBlobLocation = blobEvent?.Blob_Location || blobEvent?.blobLocation || blobEvent?.storagePath || blobEvent?.StoragePath || blobEvent?.filePath || '';
    const evtBlobFileName = blobEvent?.Blob_File_Name || blobEvent?.blobFileName || blobEvent?.destinationContent || blobEvent?.DestinationContent || '';

    // Flow comes from the "File Subscribe" (type 3) event
    const subscriptionEvent = events.find(e => String(e?.eventType || e?.event_type || e?.Event_Type || e?.EventType || '') === '3');
    const flowValue = subscriptionEvent?.subscription || item.subscription || item.description || '-';

    events.forEach(event => {
      const resolvedEventType = resolveNonDtcEventType(Object.keys(event).length ? event : { eventType: item.eventType });
      if (resolvedEventType === null) return;

      rows.push({
        uniqueId:    item.id || '',
        flow:        flowValue,
        version:     item.version || item.subscription || '-',
        fileId:      item.id || '-',
        timestamp:   formatDateTime(event.timestamp || item.timestamp || ''),
        fromRole:    item.fromRole || '-',
        fromMPID:    item.fromMPID || '-',
        toRole:      item.toRole || '-',
        toMPID:      item.toMPID || '-',
        sourceApplication: item.sourceAppName || '-',
        application: event.destinationApplication || event.applicationName || '',
        status:      mapNonDtcStatus(event.status ?? event.Status ?? item.status ?? ''),
        fileType,
        fileName:    fileName || '-',
        sourceApp:   item.sourceAppName || item.subscription || '-',
        sourceFile:  fileName || '',
        subscription: item.subscription || '',
        sourcePath:  item.sourcePath || '',
        destinationPath: displayDestPath,
        _blobPath:   blobPath,
        Blob_Archive_Link_Location: itemBlobArchive || evtBlobArchive,
        Blob_Location:              itemBlobLocation || evtBlobLocation,
        Blob_File_Name:             itemBlobFileName || evtBlobFileName,
        Source_FileName:            fileName,
        eventType: resolvedEventType,
        startDate: item.events?.[0]?.timestamp
          ? new Date(item.events[0].timestamp).toLocaleString('en-GB') : '',
        endDate: item.events?.[item.events.length - 1]?.timestamp
          ? new Date(item.events[item.events.length - 1].timestamp).toLocaleString('en-GB') : '',
        rawData: item,
      });
    });
  });

  return rows;
};
