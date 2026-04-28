# UKPN Audit App — Code Review Guide

---

## 1. Application Overview

The UKPN Audit App is a React-based web application that displays and filters audit logs for file transfers across the UKPN Income Management (IM) system. It covers two types of file transfer:

- **DTC (Data Transfer Catalogue)** — structured file transfers between registered parties
- **Non-DTC** — SAP PI-based file transfers that do not follow the DTC standard

The app fetches data from Azure Function APIs, flattens the nested JSON into flat table rows, and renders them in paginated, filterable, and exportable tables.

---

## 2. Architecture & Data Flow

```
Azure Function APIs
       │
       ▼
  AppContext.jsx          ← fetches and stores raw API data globally
       │
       ▼
  flattenUtils.js         ← transforms nested JSON → flat rows (one per event)
       │
       ├── auditUtils.js  ← header parsing, date formatting, field resolution
       ├── eventTypes.js  ← event type code → label mappings
       └── statusUtils.js ← failed status detection logic
       │
       ▼
  DtcAudit.jsx / NonDtcAudit.jsx   ← page components
       │
       ├── useAuditFilters.js       ← filter state + session persistence hook
       ├── dtcFilterUtils.js        ← filter logic applied to flat rows
       ├── DtcFilterDropdown.jsx    ← filter UI component
       └── DataTable.jsx            ← renders flat rows as paginated table
```

### Raw data shape (from API)
Each API record looks like this:
```json
{
  "id": "abc123",
  "Header_String": "ZHV|D0132001|X|EELC|R|TR01",
  "Source_FileName": "test_file.txt",
  "events": [
    { "Event_Type": "1", "Status": "Success", "timestamp": "2026-02-01T10:00:00Z", "applicationName": "ElectraLink" },
    { "Event_Type": "22", "Status": "Delivered", "timestamp": "2026-02-01T10:05:00Z", "applicationName": "ElectraLink" }
  ]
}
```

Each record has **one file** with **multiple events** (the log). The flatten step explodes this into one table row per event.

---

## 3. Key Files — Line-by-Line Explanation

---

### 3.1 `src/constants/apiConfig.js`

**Purpose:** Single source of truth for all Azure Function API URLs and auth codes.

```js
const HOST = process.env.REACT_APP_API_HOST || 'https://...azurewebsites.net';
```
- Reads the base host from `.env`. If not set, falls back to the hardcoded DEV host.
- All endpoint URLs are built from this single `HOST` so changing the host in `.env` updates every API call automatically.

```js
const code = (envKey) => process.env[envKey] || '';
```
- Helper that reads an Azure Function auth code from `.env`.
- Azure Functions require a `?code=` query parameter to authorise calls. These codes act as API keys.

```js
export const ENDPOINTS = {
  dtcAudit: endpoint('/api/fileconnectDtcAuditData', 'dtc'),
  ...
};
```
- `endpoint()` concatenates `HOST + path + ?code=<value>` into a full URL.
- Every service file imports from `ENDPOINTS` — no URL strings are ever written inline in business logic.

```js
export const DTC_PAGE_SIZE = 100;
export const NON_DTC_PAGE_SIZE = 200;
```
- DTC uses a smaller page size (100) because the backend has a gateway timeout risk for large pages.
- Non-DTC is unaffected so uses 200.

---

### 3.2 `src/constants/eventTypes.js`

**Purpose:** Maps numeric Event_Type codes (from the API) to human-readable labels. Also holds helper functions for resolving and displaying event types.

#### `DTC_EVENT_TYPE_MAP`
```js
export const DTC_EVENT_TYPE_MAP = {
  '0':  'Invalid Structure',
  '1':  'Archived',
  '2':  'Valid Subscription',
  ...
  'File Store to Blob': null,   // null = hidden, filtered out of table
};
```
- Maps the raw `Event_Type` field to a display label.
- Entries mapped to `null` are suppressed — they represent internal storage events that are not meaningful to users (e.g. "File Store to Blob").

#### `FAILED_FILES_EVENT_LABELS`
```js
export const FAILED_FILES_EVENT_LABELS = {
  '1': 'Received',
  '2': 'Subscribed',
  '3': 'Published',
  '4': 'Delivered',
  'Failed': 'Failed',
};
```
- A shorter label set used by the Failed Files pages and filter dropdowns.
- Diverges intentionally from `DTC_EVENT_TYPE_MAP` — these are the shorter "business-facing" names.

#### `resolveDtcEventType(event)`
```js
export const resolveDtcEventType = (event) => {
  const status = String(event?.Status || '').trim();
  if (status === 'Failed') return 'Failed';        // ← override: always show "Failed" for failed events
  const key = event?.Event_Type;
  if (key in DTC_EVENT_TYPE_MAP) return DTC_EVENT_TYPE_MAP[key]; // may be null (hidden)
  return key || 'Unknown';
};
```
- If the event's Status is "Failed", the label is always "Failed" regardless of event type.
- Otherwise looks up the type in the map. Returns `null` for suppressed types.
- Falls back to the raw `Event_Type` value if not in the map (e.g. unknown future types).

#### `mapStatusDisplay(status)`
```js
export const STATUS_DISPLAY_MAP = {
  'file delivered': 'Net App Delivered',
  'file transfer': 'Delivered',
  'file transferred': 'Delivered',
};
```
- Normalises raw API status strings that have inconsistent naming into clean display labels.
- Used by `flattenUtils.js` when building the `status` field for each table row.

---

### 3.3 `src/utils/auditUtils.js`

**Purpose:** Low-level utility functions for parsing header strings, formatting dates, and resolving field values from inconsistently-named API fields.

#### `parseHeader(headerStr)`
```js
export const parseHeader = (headerStr) => {
  const parts = headerStr.split('|');
  return {
    flowVersion: parts[1] || '',   // e.g. "D0132001"
    fromRole:    parts[2] || '',   // e.g. "X"
    fromMPID:    parts[3] || '',   // e.g. "EELC"
    toRole:      parts[4] || '',   // e.g. "R"
    toMPID:      parts[5] || '',   // e.g. "%"
    recApp:      parts[6] || '',   // e.g. "TR01"
  };
};
```
- The `Header_String` field in the API contains pipe-delimited metadata: `ZHV|D0132001|X|EELC|R|%|TR01`.
- This function splits on `|` and maps each position to a named field.
- Position 0 (`ZHV`) is ignored — it's a fixed prefix.

#### `formatFlowVersion(flowVersion)`
```js
export const formatFlowVersion = (flowVersion) => {
  const match = flowVersion.match(/^(.+)(\d{3})$/);
  if (match) return `${match[1]} ${match[2]}`;
  return flowVersion;
};
```
- The API returns flow+version concatenated: `"D0132001"`.
- This splits the last 3 digits off as the version: `"D0132 001"`.
- Makes the Flow and Version columns display correctly in the table.

#### `deriveFlowVersion(item, parsedFlowVersion)`
```js
export const deriveFlowVersion = (item, parsedFlowVersion, flowFromFilename) => {
  const direct = parsedFlowVersion || item.Flow_Version || item.flow_version || ...;
  if (direct) return direct;
  // last resort: combine Flow + Version fields separately
  const flowOnly = item.Flow || item.flow || '';
  const versionOnly = normalizeVersion(item.Version || item.version || '');
  if (flowOnly && versionOnly) return `${flowOnly} ${versionOnly}`;
  return flowOnly;
};
```
- Different API serialisers use different field names (`Flow_Version`, `flowVersion`, `flow`).
- This function tries all known variants in priority order to ensure the flow is resolved regardless of serialiser.

#### `pick(...candidates)`
```js
export const pick = (...candidates) => candidates.find(v => v && v !== 'UNKNOWN') || '';
```
- Returns the first non-empty, non-"UNKNOWN" value from a list.
- Used wherever a field might exist under multiple key names (e.g. `File_ID`, `fileId`, `file_id`).

#### `formatDateTime(timestamp)`
```js
export const formatDateTime = (timestamp) => {
  // 1. Try parsing as already-formatted UK date (DD/MM/YYYY or DD-MM-YYYY)
  const ukMatch = String(timestamp).match(/^(\d{2})[-/](\d{2})[-/](\d{4})\s*(\d{2}):(\d{2}):(\d{2})/);
  if (ukMatch) {
    const [, day, month, year, hours, minutes, seconds] = ukMatch;
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }
  // 2. Parse as ISO / standard date and format in Europe/London timezone
  const date = new Date(timestamp);
  ...
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};
```
- Handles two input formats: pre-formatted UK strings AND ISO timestamps.
- Always outputs `DD/MM/YYYY HH:MM:SS` in the UK/London timezone.
- The London timezone is important — the API timestamps may be UTC and BST shifts must be applied correctly.

#### `flattenFailedAuditEvents(data, eventTypeMap)`
```js
export const flattenFailedAuditEvents = (data, eventTypeMap = {}) => {
  data.forEach(item => {
    const reversedEvents = [...item.events].reverse(); // most recent event first
    reversedEvents.forEach(event => {
      flatData.push({
        ...item,                          // spread all top-level fields
        eventType: event.Status || 'Unknown',  // show actual status from the log
        status:    event.Status || 'Unknown',
        ...                               // override with correctly resolved fields
      });
    });
  });
};
```
- Creates one flat row per event (most recent event first due to `.reverse()`).
- The `eventType` column shows the **actual Status from the log** — dynamically from the data, not a hardcoded label.
- Spread of `...item` means all raw API fields are available on each row for detail views and exports.

---

### 3.4 `src/utils/flattenUtils.js`

**Purpose:** The central data transformation layer. Converts raw nested API records into flat arrays of rows for DTC and Non-DTC audit tables.

#### `normalizeAppName(name)` — Application Name Correction
```js
const APP_NAME_MAP = {
  'electralink': 'ElectraLink',
  'grey_it':     'IM Grey IT',
  'im_greyit':   'IM Grey IT',
};
const normalizeAppName = (name) => {
  if (!name) return name;
  return APP_NAME_MAP[String(name).toLowerCase()] ?? name;
};
```
- The API returns application names with inconsistent casing/formatting (e.g. `"Electralink"`, `"Grey_IT"`).
- This lookup table corrects them to the proper display values at the point of data ingestion.
- Applied to all Source and Destination application fields for both DTC and Non-DTC.

#### `flattenDtcItem(item)` — DTC Row Flattening
```js
const flattenDtcItem = (item) => {
  const parsed = parseHeader(item.Header_String);   // extract flow/role/MPID from header
  const events = item.events || [];
  if (!events.length) return [];

  const sourceApplication = normalizeAppName(events[0]?.applicationName) || 'Unknown';
  // Source app comes from the FIRST event — it identifies where the file originated
  
  return [...events].reverse().reduce((rows, event) => {
    const eventStatus = event.Status || event.status || 'Unknown';

    // Skip "valid subscription" noise — these are background handshake events
    if (eventStatus.toLowerCase().trim() === 'valid subscription') return rows;

    // Skip event types mapped to null in DTC_EVENT_TYPE_MAP (e.g. "File Store to Blob")
    // These are internal storage events not meaningful to users
    if (event.Event_Type in DTC_EVENT_TYPE_MAP && DTC_EVENT_TYPE_MAP[event.Event_Type] === null) return rows;

    const eventType = mapStatusDisplay(eventStatus);
    // eventType column shows the actual Status from the log (e.g. "Delivered", "Failed")
    // NOT a hardcoded label — dynamically derived from what the API returns

    const application = DTC_EVENT_TYPES_WITH_DESTINATION.has(String(event.Event_Type))
      ? normalizeAppName(event.applicationName || event.Destination_Application) || ''
      : '';
    // Destination app is only meaningful for event types 3, 4, 22 (Subscribed/NetApp Delivered/Delivered)
    // For all other event types, destination is left blank

    rows.push({ ...all resolved fields... });
    return rows;
  }, []);
};
```

#### `flattenNonDtcAuditData(data)` — Non-DTC Row Flattening
- Similar to DTC but uses different field names (`sourceAppName` vs `applicationName`).
- Flow comes from the type-3 ("File Subscribe") event's `subscription` field — not from the header string.
- Blob archive fields are resolved from both top-level item AND a specific type-2 event.
- The `application` destination is `event.destinationApplication || event.applicationName`.

#### `buildFilteredDtcResults(data, filters)` — Flatten + Filter in One Pass
```js
export const buildFilteredDtcResults = (data = [], filters = {}) => {
  const flat = data.flatMap(flattenDtcItem);  // 1. flatten all records
  return applyDtcFilters(flat, filters);       // 2. apply all active filters
};
```
- Used by `DtcAudit.jsx` when the user clicks "Apply" on the filter panel.
- Splitting flatten and filter into two steps (rather than one combined loop) keeps each concern separate and testable.

---

### 3.5 `src/utils/statusUtils.js`

**Purpose:** Centralised logic for detecting whether a file/event is "failed". Used to populate the Failed Files pages.

#### `FAILED_EVENT_TYPES`
```js
export const FAILED_EVENT_TYPES = new Set(['0', '5', '6', '8', '9', '21']);
```
- Event types that unconditionally mean the file has failed:
  - `0` = Invalid Structure
  - `5` = Invalid Path
  - `6` = App Inactive
  - `8` = Checksum Mismatch
  - `9` = Delivery Failed to NetApp
  - `21` = Duplicate

#### `isDtcFailedStatus(status)`
```js
export const isDtcFailedStatus = (status) => {
  const normalized = normalizeStatus(status);
  if (!normalized || isDuplicateChecksumStatus(normalized)) return false;
  return normalized === 'failed' || normalized === 'checksum mismatch';
};
```
- "Duplicate Checksum" is explicitly excluded — it looks like a failure but is a legitimate deduplication event.
- Only "Failed" and "Checksum Mismatch" statuses count as DTC failures.

#### `isNonDtcFailedStatus(status)`
```js
return (
  normalized.includes('fail') ||
  normalized.includes('invalid') ||
  normalized.includes('error') ||
  ...
);
```
- Non-DTC uses broad keyword matching because SAP PI generates many different failure status strings.
- "Invalid Subscription" is excluded even though it matches "invalid" — it represents a legitimate non-delivery to unsubscribed parties, not a failure.

#### `isNonDtcFailedRecord(item)`
```js
export const isNonDtcFailedRecord = (item) => {
  if (isNonDtcFailedStatus(item.status)) return true;   // top-level status check
  return events.some((e) =>                              // OR any event is failed
    isNonDtcFailedStatus(e?.status) || isFailedEventType(e?.Event_Type)
  );
};
```
- Checks both the item-level status AND individual events because Non-DTC records can have a "Success" top-level status but contain failed sub-events.

---

### 3.6 `src/utils/dtcFilterUtils.js`

**Purpose:** Applies user-selected filter criteria to the flat array of DTC event rows.

#### How filters work
```js
export const applyDtcFilters = (results, filters) => {
  let filtered = [...results];  // start with all rows

  // Multi-select filters (comma-separated values)
  if (filters.sourceApplication && filters.sourceApplication !== 'All') {
    const selected = filters.sourceApplication.split(',').map(normalizeFilterValue).filter(Boolean);
    filtered = filtered.filter(r => selected.includes(normalizeFilterValue(r.sourceApplication)));
  }
  // ... same pattern for destinationApplication, eventType, flow, version, etc.
```
- Filters are passed as comma-separated strings (e.g. `"ElectraLink,IM Grey IT"`).
- Each filter splits on comma, normalises to lowercase, then checks if the row's value is in the selected set.
- Filter values `'All'` or empty string mean "no filter applied" — all rows pass through.

#### Date range filters
```js
if (filters.eventTimestampFrom) {
  const from = new Date(filters.eventTimestampFrom);
  filtered = filtered.filter(r => {
    const ts = getTimestamp(r);         // prefer rawTimestamp over formatted timestamp
    return ts && new Date(ts) >= from;
  });
}
```
- Uses `rawTimestamp` (the original ISO string from the API) rather than the formatted display timestamp for accurate date comparison.
- Formatted timestamps are strings like "28/04/2026 10:00:00" which don't parse reliably with `new Date()`.

#### Publish Date filter
```js
if (filters.publishDate) {
  filtered = filtered.filter(r => {
    if (r.eventType !== 'Published') return false;  // only applies to Published events
    const ts = getTimestamp(r);
    return new Date(ts).toISOString().split('T')[0] === filters.publishDate;
  });
}
```
- Publish Date is special — it only applies to rows whose `eventType` is "Published".
- The date is compared as a plain `YYYY-MM-DD` string (ISO date portion).

---

### 3.7 `src/hooks/useAuditFilters.js`

**Purpose:** A reusable React hook that manages filter state, applies filters, and persists state to `sessionStorage` so users don't lose their filters when navigating to a detail page and back.

#### State managed by the hook
```
filters         — current (unapplied) filter values in the form
appliedFilters  — last-applied filter values (shown in "Selection Criteria" panel)
filteredResults — array of rows matching the applied filters
hasQueried      — whether the user has run a query (controls table column set)
```

#### Session persistence
```js
const saved = sessionGet(`${storageKey}_filters`);
const wasQueried = sessionGet(`${storageKey}_queried`);
if (saved && wasQueried && dataDeps are loaded) {
  setFilteredResults(applyFnRef.current(saved));  // re-apply saved filters
  setHasQueried(true);
}
```
- When a user navigates to an audit detail and presses Back, the filter results are automatically restored.
- `dataDeps` (usually `[globalAuditData]`) ensures filters are not re-applied until data has actually loaded.

#### `applyFnRef` — stale closure prevention
```js
const applyFnRef = useRef(applyFn);
useEffect(() => { applyFnRef.current = applyFn; });
```
- `applyFn` captures `globalAuditData` in its closure. If we store it directly in `useEffect` deps, it could be stale when the persistence `useEffect` runs.
- Using a ref ensures the latest version of `applyFn` is always called.

---

### 3.8 `src/pages/DtcAudit.jsx`

**Purpose:** The main DTC Audit page. Orchestrates data loading, filter UI, charts, and the audit table.

#### Component structure
```
DtcAudit
 ├── AuditPageHeader    — title, KPI chips (total events, flows), Charts/Filters toggle buttons
 ├── CollapsibleSection — wraps the Charts bar (visible when showCharts = true)
 ├── CollapsibleSection — wraps the Filter panel (visible when showFilters = true)
 ├── SelectionCriteria  — shows which filters are currently applied
 └── DataTable          — the main paginated event table
```

#### Data flow inside the component
```js
// 1. Raw data comes from AppContext (loaded globally on app start)
const { auditData: globalAuditData } = useApp();

// 2. Flatten ALL records once for the default unfiltered view
const flattenedAuditData = useMemo(
  () => flattenDtcAuditData(globalAuditData), [globalAuditData]
);

// 3. When user applies filters, buildFilteredDtcResults re-flattens + filters
const applyFilters = (f) => buildFilteredDtcResults(globalAuditData, f);
const { filteredResults, hasQueried, apply, reset } = useAuditFilters(..., applyFilters, ...);

// 4. Table shows filtered rows if a query was run, otherwise all rows
const tableData = hasQueried ? filteredResults : flattenedAuditData;
```

#### Column set selection
```js
const columns = hasQueried
  ? (isBusiness ? DTC_SUMMARY_COLUMNS_COMBINED_FLOW : DTC_SUMMARY_COLUMNS_COMBINED_FLOW_VERSION)
  : (isBusiness ? DEFAULT_COLUMNS_BUSINESS : DEFAULT_COLUMNS_FULL);
```
- Before querying: shows the "browse" column set (fewer columns, optimised for scanning).
- After querying: shows the "summary" column set (more detail, same as what exports use).
- Business users see a reduced column set (no internal routing fields like HFile_ID).

#### Auto-fetch on pagination
```js
useEffect(() => {
  if (hasQueried) return;                    // not active when filters applied
  if (!dtcHasMore || dtcLoadingMore) return; // no more pages or already loading
  const requiredRows = (currentTablePage + 1) * tablePageSize;
  if (flattenedAuditData.length < requiredRows) {
    loadMoreDtcData();                       // fetch next page from API
  }
}, [currentTablePage, tablePageSize, ...]);
```
- DTC data is paginated at the API level (100 records per page).
- When the user scrolls to a table page that needs rows not yet loaded, `loadMoreDtcData()` is called automatically.
- This only runs in the unfiltered view — when a filter query is active, all matching data is already loaded.

---

### 3.9 `src/pages/DtcFailedFiles.jsx` and `DtcFailedFilesDetail.jsx`

**Purpose:** Shows only the DTC events that represent file failures. `DtcFailedFiles` is a summary view; `DtcFailedFilesDetail` shows all 21 columns.

#### How failed records are identified
```js
// Step 1: Flatten all audit events into rows
const flattenedData = flattenFailedAuditEvents(auditData, EVENT_TYPE_MAP);

// Step 2: Keep only rows that are failed
const failedRecords = flattenedData.filter(
  row => isDtcFailedStatus(row.status) || isFailedEventType(row.rawEventType)
);
```
- `isDtcFailedStatus` catches Status = "Failed" or "Checksum Mismatch".
- `isFailedEventType` catches Event_Type codes 0, 5, 6, 8, 9, 21 (structural failures).
- Both conditions are checked because a failure can be expressed as either a status string or an event type code depending on the API serialiser.

#### Filters in Failed Files
```js
const failedFiles = failedRecords.filter(row => {
  if (selectedFlows.size && !selectedFlows.has(row.flow)) return false;
  if (lower && !row.fileName?.toLowerCase().includes(lower)) return false;
  return true;
});
```
- Only two filters are available: Flow (multi-select) and File Name (text search).
- Flow uses a `Set` for O(1) membership lookup — efficient even for large datasets.

---

## 4. Application Name Normalisation

Application names from the API contain inconsistent casing and underscores. The `normalizeAppName` function in `flattenUtils.js` corrects these at data ingestion time:

| API value     | Displayed as  |
|---------------|---------------|
| `Electralink` | `ElectraLink` |
| `Grey_IT`     | `IM Grey IT`  |
| `IM_GreyIT`   | `IM Grey IT`  |

Adding new corrections: simply add a new entry to `APP_NAME_MAP` in `flattenUtils.js`. The key must be the **lowercase** version of the API value.

---

## 5. Event Timestamp Format

All timestamps are formatted by `formatDateTime()` in `auditUtils.js` and displayed as:

```
DD/MM/YYYY HH:MM:SS
```

in the Europe/London timezone (handles BST/GMT automatically via `Intl.DateTimeFormat`).

---

## 6. Event Type Column

The `eventType` column in ALL audit tables shows the **actual Status value from the log event** (e.g. "Delivered", "Failed", "Checksum Mismatch") — not a hardcoded label. This ensures the table always reflects what the API returned, regardless of Event_Type code.

Suppressed event types (those mapped to `null` in `DTC_EVENT_TYPE_MAP`, such as "File Store to Blob") are filtered out entirely and never appear as table rows.

---

## 7. Filter Persistence

Filter state is persisted to `sessionStorage` by `useAuditFilters`. This means:

- If a user applies filters, navigates to a detail page, and presses Back — the filters and results are automatically restored.
- If the user closes the tab or navigates away from the app, filters are cleared (sessionStorage is tab-scoped).

Storage keys follow the pattern `<storageKey>_filters` and `<storageKey>_queried` (e.g. `dtcAudit_filters`).

---

## 8. Role-Based Column Sets

| Role              | DTC Audit columns         | Export columns    |
|-------------------|---------------------------|-------------------|
| Business          | Combined flow (no HFile)  | Same              |
| Monitoring Team   | Full columns (all fields) | Same              |
| Core Support      | Full columns              | Same              |
| Admin             | Full columns              | Same              |

Business users do not see internal routing fields (HFile_ID, raw Event_Type codes) to keep the view clean for non-technical stakeholders.
