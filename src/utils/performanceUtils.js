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
  return ms === null ? null : ms / 1000;
};

/**
 * Format total milliseconds → "HH:MM:SS.mmm".
 * Always pads to ensure consistent output (e.g., 04:05:09.007).
 */
export const formatMs = (totalMs) => {
  if (!Number.isFinite(totalMs) || totalMs < 0) return '00:00:00.000';
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

// Keep backward-compatible alias used elsewhere in the codebase
export const formatDurationHMS = formatSeconds;

// ─── Weighted average ────────────────────────────────────────────────────────

/**
 * Calculate overall average from an array of per-app stats.
 *
 * Formula: Σ(all individual file durations) ÷ total files
 *   e.g. (00:01:05 + 00:02:15 + 00:00:30 + 00:00:10) ÷ 4
 *
 * Uses totalDuration (sum of raw individual durations per app) directly —
 * avoids the avgTime×files roundtrip and preserves full precision.
 * Falls back to parsing avgTime string or actual×1000 if totalDuration absent.
 * Skips entries where files ≤ 0 or time value is invalid.
 * Returns "00:00:00.000" if total_files = 0.
 */
export const calculateOverallAverage = (data) => {
  if (!Array.isArray(data) || data.length === 0) {
    return { overallAvgTime: '00:00:00.000', totalFiles: 0, totalTimeMs: 0 };
  }

  let totalTimeMs = 0;
  let totalFiles = 0;

  data.forEach((entry) => {
    const files = Number(entry?.files);
    if (!Number.isFinite(files) || files <= 0) return;

    // Primary: use totalDuration (seconds) — exact sum of all individual file durations
    if (Number.isFinite(entry?.totalDuration) && entry.totalDuration >= 0) {
      totalTimeMs += entry.totalDuration * 1000;
      totalFiles += files;
      return;
    }

    // Fallback 1: parse avgTime string to ms then reconstruct total
    let avgMs = parseToMs(entry?.avgTime);

    // Fallback 2: derive from actual (seconds float)
    if (avgMs === null && Number.isFinite(entry?.actual) && entry.actual >= 0) {
      avgMs = entry.actual * 1000;
    }

    if (avgMs === null || !Number.isFinite(avgMs) || avgMs < 0) return;

    totalTimeMs += avgMs * files;
    totalFiles += files;
  });

  if (totalFiles === 0) {
    return { overallAvgTime: '00:00:00.000', totalFiles: 0, totalTimeMs: 0 };
  }

  return {
    overallAvgTime: formatMs(totalTimeMs / totalFiles),
    totalFiles,
    totalTimeMs,
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

const getBoundaryEvents = (events = []) => {
  const allTimes = [];
  const event1Times = [];
  const event4Times = [];

  events.forEach((event) => {
    const eventType = getEventType(event);
    const timeMs = getEventTimeMs(event);
    if (!Number.isFinite(timeMs)) return;

    allTimes.push(timeMs);
    if (eventType === '1') event1Times.push(timeMs);
    if (eventType === '4') event4Times.push(timeMs);
  });

  if (allTimes.length === 0) return null;

  const startMs = event1Times.length > 0 ? Math.min(...event1Times) : Math.min(...allTimes);
  const endMs   = event4Times.length > 0 ? Math.max(...event4Times) : Math.max(...allTimes);

  return { startMs, endMs };
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
    const boundaries = getBoundaryEvents(events);
    if (!boundaries || boundaries.endMs < boundaries.startMs) return;

    const durationSec = (boundaries.endMs - boundaries.startMs) / 1000;
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
    const boundaries = getBoundaryEvents(events);
    if (!boundaries || boundaries.endMs < boundaries.startMs) return;

    const durationSec = (boundaries.endMs - boundaries.startMs) / 1000;
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
