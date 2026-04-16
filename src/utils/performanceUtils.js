export const formatDurationHMS = (seconds) => {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = String(Math.floor(safeSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((safeSeconds % 3600) / 60)).padStart(2, '0');
  const secs = String(safeSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${secs}`;
};

const MAX_DURATION_SECONDS = 3600;

const getEventType = (event) =>
  String(event?.eventType || event?.event_type || event?.Event_Type || event?.EventType || '').trim();

const getEventTimestamp = (event) =>
  event?.timestamp || event?.Timestamp || event?.created || event?.Created || '';

const getEventTimeMs = (event) => {
  const rawTimestamp = getEventTimestamp(event);
  if (!rawTimestamp) return null;

  const parsed = new Date(rawTimestamp).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

const getBoundaryEvents = (events = []) => {
  const event1Times = [];
  const event4Times = [];

  events.forEach((event) => {
    const eventType = getEventType(event);
    const timeMs = getEventTimeMs(event);
    if (!Number.isFinite(timeMs)) return;

    if (eventType === '1') event1Times.push(timeMs);
    if (eventType === '4') event4Times.push(timeMs);
  });

  if (event1Times.length === 0 || event4Times.length === 0) return null;

  return {
    startMs: Math.min(...event1Times),
    endMs: Math.max(...event4Times),
  };
};

const addDurationToStats = (appStats, allFileDurations, appName, durationSec) => {
  if (!Number.isFinite(durationSec) || durationSec < 0 || durationSec > MAX_DURATION_SECONDS) {
    return;
  }

  allFileDurations.push(durationSec);

  if (!appStats.has(appName)) {
    appStats.set(appName, { totalDuration: 0, files: 0 });
  }

  const current = appStats.get(appName);
  current.totalDuration += durationSec;
  current.files += 1;
};

export const buildPerformanceStats = (auditData = [], nonDtcAuditData = []) => {
  const appStats = new Map();
  const allFileDurations = [];

  auditData.forEach((item) => {
    const events = Array.isArray(item?.events) ? item.events : [];
    const boundaries = getBoundaryEvents(events);
    if (!boundaries || boundaries.endMs < boundaries.startMs) return;

    const durationSec = (boundaries.endMs - boundaries.startMs) / 1000;
    const appName =
      events.find((event) => getEventType(event) === '1')?.applicationName ||
      item?.Application_Name ||
      item?.Source_Application ||
      item?.source_application ||
      'Unknown';

    addDurationToStats(appStats, allFileDurations, appName, durationSec);
  });

  nonDtcAuditData.forEach((item) => {
    const events = Array.isArray(item?.events) ? item.events : [];
    const boundaries = getBoundaryEvents(events);
    if (!boundaries || boundaries.endMs < boundaries.startMs) return;

    const durationSec = (boundaries.endMs - boundaries.startMs) / 1000;
    const appName =
      item?.sourceAppName ||
      item?.subscription ||
      events.find((event) => getEventType(event) === '1')?.applicationName ||
      'Unknown';

    addDurationToStats(appStats, allFileDurations, appName, durationSec);
  });

  const systemStats = Array.from(appStats.entries())
    .map(([name, stats]) => {
      const actual = stats.files > 0 ? stats.totalDuration / stats.files : 0;
      return {
        name,
        avgTime: formatDurationHMS(actual),
        actual,
        files: stats.files,
        totalDuration: stats.totalDuration,
      };
    })
    .sort((a, b) => b.actual - a.actual);

  return { systemStats, allFileDurations };
};
