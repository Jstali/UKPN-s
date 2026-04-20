// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Parse "HH:MM:SS" or "HH:MM:SS.mmm" → total milliseconds (integer).
 * The fractional part is treated as milliseconds, right-padded to 3 digits.
 *   "00:00:00.507" → 507 ms
 *   "00:00:00.5"   → 500 ms
 *   "00:01:05"     → 65000 ms
 * Returns null for null, undefined, or malformed strings.
 */
export const parseToMs = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const match = timeStr.trim().match(/^(\d+):(\d{2}):(\d{2})(?:\.(\d+))?$/);
  if (!match) return null;
  const [, h, m, s, frac] = match;
  const wholeMs =
    (parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + parseInt(s, 10)) * 1000;
  // Right-pad fractional part to 3 digits so ".5" → 500 ms, ".507" → 507 ms
  const fracMs = frac ? parseInt(frac.padEnd(3, '0').slice(0, 3), 10) : 0;
  return wholeMs + fracMs;
};

/**
 * Parse "HH:MM:SS" or "HH:MM:SS.mmm" → total seconds (float).
 * Returns null for null, undefined, or malformed strings.
 */
export const parseHHMMSS = (timeStr) => {
  const ms = parseToMs(timeStr);
  return ms === null ? null : ms * 1000;
};

/**
 * Format total milliseconds → "HH:MM:SS.mmm".
 * Always pads to ensure consistent output (e.g., 04:05:09.007).
 */
export const formatMs = (totalMs) => {
  if (!Number.isFinite(totalMs) || totalMs < 0) return '00:00:00';
  const rounded = Math.round(totalMs);
  const ms = rounded % 1000;
  const totalSec = Math.floor(rounded / 1000);
  const hh = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}.${String(ms).padStart(3, '0')}`;
};

/**
 * Format total seconds → "HH:MM:SS.mmm".
 * Delegates to formatMs for consistent millisecond output.
 */
export const formatSeconds = (totalSeconds) => {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '00:00:00.000';
  return formatMs(totalSeconds * 1000);
};

/**
 * Format milliseconds to "HH:MM:SS" (rounded to nearest second).
 */
export const formatMsToHMS = (totalMs) => {
  if (!Number.isFinite(totalMs) || totalMs < 0) return '00:00:00';
  const roundedSeconds = Math.round(totalMs / 1000);
  const hh = String(Math.floor(roundedSeconds / 3600)).padStart(2, '0');
  const mm = String(Math.floor((roundedSeconds % 3600) / 60)).padStart(2, '0');
  const ss = String(roundedSeconds % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

// Keep backward-compatible alias used elsewhere in the codebase
export const formatDurationHMS = formatSeconds;

// ─── Weighted average ────────────────────────────────────────────────────────

/**
 * Resolve a system's average processing time in milliseconds using a consistent priority:
 * 1) totalDuration/files
 * 2) actual (seconds)
 * 3) avgTime string (HH:MM:SS.mmm)
 */
export const resolveSystemAvgMs = (entry) => {
  const files = Number(entry?.files);
  if (Number.isFinite(entry?.totalDuration) && entry.totalDuration >= 0 && Number.isFinite(files) && files > 0) {
    return (entry.totalDuration / files) * 1000;
  }

  if (Number.isFinite(entry?.actual) && entry.actual >= 0) {
    return entry.actual * 1000;
  }

  const parsed = parseToMs(entry?.avgTime);
  return parsed === null ? null : parsed;
};

/**
 * Convert "HH:MM:SS.mmm" (or "HH:MM:SS") to seconds (float).
 * Returns null for malformed values.
 */
export const timeToSeconds = (timeStr) => {
  const ms = parseToMs(timeStr);
  return ms === null ? null : ms / 1000;
};

/**
 * Convert seconds (float) to "HH:MM:SS.mmm".
 * Rounds to nearest millisecond.
 */
export const secondsToTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00:00.000';
  return formatSeconds(seconds);
};

/**
 * Weighted average:
 *   sum(avgTime_in_seconds * files) / sum(files)
 * Returns "HH:MM:SS.mmm".
 */
export const calculateWeightedAverage = (data) => {
  if (!Array.isArray(data) || data.length === 0) return '00:00:00.000';

  let weightedMsSum = 0;
  let totalFiles = 0;

  data.forEach((entry) => {
    const avgMs = resolveSystemAvgMs(entry);
    const files = Number(entry?.files);

    if (avgMs === null || !Number.isFinite(avgMs) || avgMs < 0) return;
    if (!Number.isFinite(files) || files <= 0) return;

    weightedMsSum += avgMs * files;
    totalFiles += files;
  });

  if (totalFiles === 0) return '00:00:00.000';
  return formatMs(weightedMsSum / totalFiles);
};

/**
 * Dashboard age:
 *   sum(all valid avgTime values) / number of valid avgTime values
 * Ignores files count completely.
 * Returns HH:MM:SS (UI without milliseconds).
 */
export const calculateOverallAverage = (data) => {
  if (!Array.isArray(data) || data.length === 0) {
    return { overallAvgTime: '00:00:00', totalEntries: 0 };
  }

  let totalTimeMs = 0;
  let totalEntries = 0;

  data.forEach((entry) => {
    const ms = resolveSystemAvgMs(entry);
    if (ms === null || !Number.isFinite(ms) || ms < 0) return;
    totalTimeMs += ms;
    totalEntries += 1;
  });

  if (totalEntries === 0) {
    return { overallAvgTime: '00:00:00', totalEntries: 0 };
  }

  return {
    overallAvgTime: formatMsToHMS(totalTimeMs / totalEntries),
    totalEntries,
  };
};

// ─── Build stats from raw audit data ────────────────────────────────────────

const MAX_DURATION_SECONDS = 3600;

const getEventType = (event) =>
  String(event?.eventType || event?.event_type || event?.Event_Type || event?.EventType || '').trim();

const getEventTimestamp = (event) =>
  event?.timestamp || event?.Timestamp || event?.created || event?.Created || '';

const getEventTimeMs = (event) => {
  const raw = getEventTimestamp(event);
  if (!raw) return null;
  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

// Returns duration in seconds for one file: Event 22 timestamp - Event 1 timestamp.
// Falls back to Event 4 if Event 22 is absent (e.g. Non-DTC files).
const getFileDurationSec = (events = []) => {
  let event1Ms = null;
  let event22Ms = null;
  let event4Ms = null;

  events.forEach((event) => {
    const eventType = getEventType(event);
    const timeMs = getEventTimeMs(event);
    if (!Number.isFinite(timeMs)) return;

    if (eventType === '1') {
      if (event1Ms === null || timeMs < event1Ms) event1Ms = timeMs;
    }
    if (eventType === '22') {
      if (event22Ms === null || timeMs > event22Ms) event22Ms = timeMs;
    }
    if (eventType === '4') {
      if (event4Ms === null || timeMs > event4Ms) event4Ms = timeMs;
    }
  });

  if (event1Ms === null) return null;
  const endMs = event22Ms ?? event4Ms;
  if (endMs === null || endMs < event1Ms) return null;
  return (endMs - event1Ms) / 1000;
};

const addDurationToStats = (appStats, appName, durationSec) => {
  if (!Number.isFinite(durationSec) || durationSec < 0 || durationSec > MAX_DURATION_SECONDS) return;

  if (!appStats.has(appName)) {
    appStats.set(appName, { totalDuration: 0, files: 0 });
  }
  const s = appStats.get(appName);
  s.totalDuration += durationSec;
  s.files += 1;
};

export const buildPerformanceStats = (auditData = [], nonDtcAuditData = []) => {
  const appStats = new Map();

  auditData.forEach((item) => {
    const events = Array.isArray(item?.events) ? item.events : [];
    const durationSec = getFileDurationSec(events);
    if (durationSec === null) return;

    const appName =
      events.find((e) => getEventType(e) === '1')?.applicationName ||
      item?.Application_Name ||
      item?.Source_Application ||
      item?.source_application ||
      'Unknown';

    addDurationToStats(appStats, appName, durationSec);
  });

  nonDtcAuditData.forEach((item) => {
    const events = Array.isArray(item?.events) ? item.events : [];
    const durationSec = getFileDurationSec(events);
    if (durationSec === null) return;

    const appName =
      item?.sourceAppName ||
      item?.subscription ||
      events.find((e) => getEventType(e) === '1')?.applicationName ||
      'Unknown';

    addDurationToStats(appStats, appName, durationSec);
  });

  const systemStats = Array.from(appStats.entries())
    .map(([name, stats]) => {
      const actual = stats.files > 0 ? stats.totalDuration / stats.files : 0;
      return {
        name,
        avgTime: formatMs(actual * 1000),
        actual,
        files: stats.files,
        totalDuration: stats.totalDuration,
      };
    })
    .sort((a, b) => b.actual - a.actual);

  return { systemStats };
};
