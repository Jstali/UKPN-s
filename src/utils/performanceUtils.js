// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Parse "HH:MM:SS" or "HH:MM:SS.mmm" → total seconds (float).
 * Returns null for null, undefined, or malformed strings.
 */
export const parseHHMMSS = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const match = timeStr.trim().match(/^(\d+):(\d{2}):(\d{2})(?:\.(\d+))?$/);
  if (!match) return null;
  const [, h, m, s, ms] = match;
  const whole = parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + parseInt(s, 10);
  const frac = ms ? parseFloat(`0.${ms}`) : 0;
  return whole + frac;
};

/**
 * Format total seconds (float) → "HH:MM:SS".
 * If 0 < seconds < 1, shows milliseconds: "00:00:00.mmm".
 */
export const formatSeconds = (totalSeconds) => {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '00:00:00';

  if (totalSeconds > 0 && totalSeconds < 1) {
    const ms = Math.round(totalSeconds * 1000);
    return `00:00:00.${String(ms).padStart(3, '0')}`;
  }

  const s = Math.floor(totalSeconds);
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

// Keep backward-compatible alias used elsewhere in the codebase
export const formatDurationHMS = formatSeconds;

// ─── Weighted average ────────────────────────────────────────────────────────

/**
 * Calculate weighted overall average from an array of
 * { avgTime: "HH:MM:SS", files: number } (or { actual: number, files }).
 *
 * Formula:
 *   totalTimeSeconds = Σ (avgSeconds_i × files_i)
 *   overallAvg       = totalTimeSeconds / Σ files_i
 *
 * Skips entries where files ≤ 0 or avgTime is null/invalid.
 * Returns { overallAvgTime, totalFiles, totalTimeSeconds }.
 */
export const calculateOverallAverage = (data) => {
  if (!Array.isArray(data) || data.length === 0) {
    return { overallAvgTime: '00:00:00', totalFiles: 0, totalTimeSeconds: 0 };
  }

  let totalTimeSeconds = 0;
  let totalFiles = 0;

  data.forEach((entry) => {
    const files = Number(entry?.files);
    if (!Number.isFinite(files) || files <= 0) return;

    // Prefer `actual` (already seconds) if present, else parse the string
    let avgSec = Number.isFinite(entry?.actual) ? entry.actual : parseHHMMSS(entry?.avgTime);
    if (avgSec === null || !Number.isFinite(avgSec) || avgSec < 0) return;

    totalTimeSeconds += avgSec * files;
    totalFiles += files;
  });

  if (totalFiles === 0) {
    return { overallAvgTime: '00:00:00', totalFiles: 0, totalTimeSeconds };
  }

  const overallAvgSec = totalTimeSeconds / totalFiles;
  return {
    overallAvgTime: formatSeconds(overallAvgSec),
    totalFiles,
    totalTimeSeconds,
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
        avgTime: formatSeconds(actual),
        actual,
        files: stats.files,
        totalDuration: stats.totalDuration,
      };
    })
    .sort((a, b) => b.actual - a.actual);

  return { systemStats };
};
