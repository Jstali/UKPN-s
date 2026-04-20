// Blob / archive path utilities shared between DTC and Non-DTC audit pages
// and DataTable's download/preview logic.

// Field names that may hold a blob storage path
export const BLOB_PATH_FIELDS = [
  'destinationPath',   'Destination_Path',   'destination_path',
  'destinationContent','DestinationContent',  'destination_content',
  'blobPath',          'BlobPath',            'blob_path',
  'blobFilePath',      'blobFileName',        'Blob_File_Name',
  'blobLocation',      'Blob_Location',       'blob_location',
  'blobArchiveLinkLocation', 'Blob_Archive_Link_Location', 'blob_archive_link_location',
  'archivePath',       'Archive_Path',        'archive_path',
  'storagePath',       'StoragePath',         'storage_path',
  'filePath',          'FilePath',            'file_path',
];

// UNC paths (\\server or //server) and absolute filesystem paths are NOT blob paths.
export const isBlobPath = (p) => {
  if (!p) return false;
  const s = String(p).trim();
  if (s.startsWith('//') || s.startsWith('\\\\') || s.startsWith('/')) return false;
  return s.length > 0;
};

// Returns the first blob path found in an object by scanning BLOB_PATH_FIELDS.
export const extractBlobPath = (obj, excludeDestination = false) => {
  const fields = excludeDestination
    ? BLOB_PATH_FIELDS.filter(f => !['destinationPath','Destination_Path','destination_path'].includes(f))
    : BLOB_PATH_FIELDS;

  for (const f of fields) {
    if (isBlobPath(obj?.[f])) return obj[f];
  }
  return '';
};

// Returns the blob path for a Non-DTC item:
// Prefers the "File Stored To Blob" (event type 2) event path, then top-level item fields.
export const getNonDtcBlobPath = (item) => {
  const blobEvent = (item.events || []).find(
    (e) => String(e?.eventType || e?.event_type || e?.Event_Type || e?.EventType || '') === '2'
  );
  if (blobEvent) {
    const path = extractBlobPath(blobEvent);
    if (path) return path;
  }
  return extractBlobPath(item, true); // exclude destinationPath at top level
};

// Destination path fields used for display (not blob-filtered).
const DEST_PATH_FIELDS = [
  'destinationPath', 'Destination_Path', 'destination_path',
  'destinationContent', 'DestinationContent', 'destination_content',
  'destPath', 'DestPath', 'dest_path',
  'targetPath', 'TargetPath', 'target_path',
  'outputPath', 'OutputPath', 'output_path',
];

// Returns the display destination path for a Non-DTC item.
// Searches events in reverse (later events = delivery events have destination),
// then falls back to top-level item fields.
export const getNonDtcDisplayDestPath = (item) => {
  for (const e of [...(item.events || [])].reverse()) {
    for (const f of DEST_PATH_FIELDS) {
      if (e[f] && String(e[f]).trim()) return String(e[f]).trim();
    }
  }
  for (const f of DEST_PATH_FIELDS) {
    if (item[f] && String(item[f]).trim()) return String(item[f]).trim();
  }
  return '';
};
