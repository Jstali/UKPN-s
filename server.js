// Express proxy + auth server for UKPN Audit App
// All Azure API codes and user credentials are read from server-side env vars only —
// they are never sent to the browser.
const express = require('express');
const cors    = require('cors');
const crypto  = require('crypto');
const fetch   = require('node-fetch');
const Redis   = require('ioredis');

const app  = express();
const PORT = process.env.PROXY_PORT || 4000;

// ─── Redis setup ──────────────────────────────────────────────────────────────
const REDIS_URL        = process.env.REDIS_URL || 'redis://localhost:6379';
const CACHE_TTL_AUDIT  = 300;   // 5 min — paginated audit data
const CACHE_TTL_REF    = 600;   // 10 min — reference/dropdown data

let redis         = null;
let redisAvailable = false;

function connectRedis() {
  redis = new Redis(REDIS_URL, {
    connectTimeout: 3000,
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    enableOfflineQueue: false,
  });
  redis.on('connect', () => { redisAvailable = true;  console.log('✅ Redis connected'); });
  redis.on('error',   (err) => {
    if (redisAvailable) console.warn('⚠️  Redis unavailable, running without cache:', err.message);
    redisAvailable = false;
  });
  redis.connect().catch(() => {});
}
connectRedis();

// ─── Cache helpers ────────────────────────────────────────────────────────────
async function getCache(key) {
  if (!redisAvailable) return null;
  try { const v = await redis.get(key); return v ? JSON.parse(v) : null; } catch { return null; }
}
async function setCache(key, data, ttl) {
  if (!redisAvailable || !ttl) return;
  try { await redis.set(key, JSON.stringify(data), 'EX', ttl); } catch {}
}
async function clearCacheByPattern(pattern) {
  if (!redisAvailable) return;
  try { const keys = await redis.keys(pattern); if (keys.length) await redis.del(...keys); } catch {}
}

// ─── Azure constants (server-side only — no REACT_APP_ prefix) ───────────────
const API_HOST = process.env.API_HOST || 'https://fadev-im-fileconnect-frontend-uks03.azurewebsites.net';

const CODES = {
  dtc:              process.env.DTC_API_CODE              || '',
  nonDtc:           process.env.SAP_API_CODE              || '',
  subscription:     process.env.SUBSCRIPTION_CODE         || '',
  flows:            process.env.FLOWS_API_CODE            || '',
  sourceApp:        process.env.SOURCE_APP_API_CODE       || '',
  destApp:          process.env.DEST_APP_API_CODE         || '',
  appStatus:        process.env.APP_STATUS_API_CODE       || '',
  dropdown:         process.env.DROPDOWN_VALUES_API_CODE  || '',
  fileStatusSummary:process.env.FILE_STATUS_SUMMARY_CODE  || '',
  auditEmailExport: process.env.AUDIT_EMAIL_EXPORT_CODE   || '',
  dtcDownload:      process.env.DTC_DOWNLOAD_API_CODE     || process.env.DTC_API_CODE || '',
  dtcPreview:       process.env.DTC_PREVIEW_API_CODE      || process.env.DTC_DOWNLOAD_API_CODE || process.env.DTC_API_CODE || '',
};

// Build a full Azure URL with its function code
const az = (path, codeKey) => `${API_HOST}${path}?code=${CODES[codeKey]}`;

// ─── Session store (in-memory) ────────────────────────────────────────────────
// Sessions are cleared on server restart — users must log in again.
const sessions = new Map(); // token → { username, role }

function getUsers() {
  try { return JSON.parse(process.env.USERS || '[]'); } catch { return []; }
}

// ─── Auth middleware ──────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = sessions.get(token);
  next();
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Auth routes ──────────────────────────────────────────────────────────────

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = getUsers().find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { username: user.username, role: user.role });
  console.log(`[auth] login: ${user.username} (${user.role})`);
  return res.json({ token, username: user.username, role: user.role });
});

app.post('/api/auth/logout', (req, res) => {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    const user = sessions.get(token);
    sessions.delete(token);
    if (user) console.log(`[auth] logout: ${user.username}`);
  }
  return res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => res.json(req.user));

// ─── Proxy helpers ────────────────────────────────────────────────────────────

// Paginated audit endpoint with Redis cache
async function proxyWithCache(req, res, azureUrl, cacheKeyPrefix, ttl) {
  const pageSize = req.query.pageSize || 100;
  const token    = req.query.continuationToken || '';
  const cacheKey = `${cacheKeyPrefix}:${pageSize}:${token}`;

  const cached = await getCache(cacheKey);
  if (cached) {
    console.log(`[cache HIT] ${cacheKey}`);
    return res.json({ ...cached, fromCache: true });
  }

  try {
    let url = `${azureUrl}&pageSize=${pageSize}`;
    if (token) url += `&continuationToken=${encodeURIComponent(token)}`;
    console.log(`[cache MISS] ${cacheKeyPrefix}`);

    const ctrl = new AbortController();
    const t    = setTimeout(() => ctrl.abort(), 60000);
    const resp = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);

    if (!resp.ok) return res.status(resp.status).json({ error: `Azure returned ${resp.status} ${resp.statusText}` });
    const data = await resp.json();
    await setCache(cacheKey, data, ttl);
    return res.json(data);
  } catch (err) {
    if (err.name === 'AbortError') return res.status(504).json({ error: 'Request timed out' });
    console.error('[proxy error]', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// Simple single-response endpoint with optional cache
async function proxySimple(req, res, azureUrl, cacheKey, ttl) {
  if (cacheKey) {
    const cached = await getCache(cacheKey);
    if (cached) {
      console.log(`[cache HIT] ${cacheKey}`);
      return res.json({ ...cached, fromCache: true });
    }
  }
  try {
    const ctrl = new AbortController();
    const t    = setTimeout(() => ctrl.abort(), 15000);
    const resp = await fetch(azureUrl, { signal: ctrl.signal });
    clearTimeout(t);

    if (!resp.ok) return res.status(resp.status).json({ error: `Azure returned ${resp.status} ${resp.statusText}` });
    const data = await resp.json();
    if (cacheKey && ttl) await setCache(cacheKey, data, ttl);
    return res.json(data);
  } catch (err) {
    if (err.name === 'AbortError') return res.status(504).json({ error: 'Request timed out' });
    console.error('[proxy error]', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ─── Proxy routes (all require a valid session token) ────────────────────────

// Paginated audit
app.get('/api/proxy/dtcAudit',    requireAuth, (req, res) =>
  proxyWithCache(req, res, az('/api/fileconnectDtcAuditData', 'dtc'),        'dtcAudit', CACHE_TTL_AUDIT));

app.get('/api/proxy/sapAudit',    requireAuth, (req, res) =>
  proxyWithCache(req, res, az('/api/fileconnectNonDtcAuditData', 'nonDtc'),  'sapAudit', CACHE_TTL_AUDIT));

// DTC count (no cache — used for display only, changes frequently)
app.get('/api/proxy/dtcAuditCount', requireAuth, (req, res) =>
  proxySimple(req, res, az('/api/fileconnectDtcAuditDocumentCount', 'dtc'), null, 0));

// Reference data (cached — changes rarely)
app.get('/api/proxy/subscriptions', requireAuth, (req, res) =>
  proxySimple(req, res, az('/api/dtcSubscriptionAPI',                'subscription'), 'subscriptions:all', CACHE_TTL_REF));

app.get('/api/proxy/flows',         requireAuth, (req, res) =>
  proxySimple(req, res, az('/api/getFlowsAPI',                       'flows'),         'flows:all',         CACHE_TTL_REF));

app.get('/api/proxy/sourceApps',    requireAuth, (req, res) =>
  proxySimple(req, res, az('/api/getSourceAppNamesAPI',              'sourceApp'),     'sourceApps:all',    CACHE_TTL_REF));

app.get('/api/proxy/destApps',      requireAuth, (req, res) =>
  proxySimple(req, res, az('/api/getDestinationApplicationsListAPI', 'destApp'),       'destApps:all',      CACHE_TTL_REF));

app.get('/api/proxy/dropdown',      requireAuth, (req, res) =>
  proxySimple(req, res, az('/api/getDropdownValuesAPI',              'dropdown'),      'dropdown:all',      CACHE_TTL_REF));

// Real-time (no cache)
app.get('/api/proxy/appStatus',         requireAuth, (req, res) =>
  proxySimple(req, res, az('/api/fileconnectApplicationStatus',  'appStatus'),         null, 0));

app.get('/api/proxy/fileStatusSummary', requireAuth, (req, res) =>
  proxySimple(req, res, az('/api/fileconnectFileStatusSummary',  'fileStatusSummary'), null, 0));

// Audit email export (POST — forwards body to Azure)
app.post('/api/proxy/auditEmailExport', requireAuth, async (req, res) => {
  try {
    const ctrl = new AbortController();
    const t    = setTimeout(() => ctrl.abort(), 30000);
    const resp = await fetch(az('/api/audit-export/send-email', 'auditEmailExport'), {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(req.body),
      signal:  ctrl.signal,
    });
    clearTimeout(t);
    if (!resp.ok) return res.status(resp.status).json({ error: `Azure returned ${resp.status}` });
    return res.json(await resp.json());
  } catch (err) {
    if (err.name === 'AbortError') return res.status(504).json({ error: 'Request timed out' });
    return res.status(500).json({ error: err.message });
  }
});

// File download — streams blob back to the browser
app.get('/api/proxy/downloadFile', requireAuth, async (req, res) => {
  const { path, type } = req.query;
  if (!path) return res.status(400).json({ error: 'Missing path parameter' });
  const codeKey = type === 'nonDtc' ? 'nonDtc' : 'dtcDownload';
  const url = `${API_HOST}/api/fileConnectDownloadFileByID?path=${encodeURIComponent(path)}&code=${CODES[codeKey]}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return res.status(resp.status).json({ error: `Azure returned ${resp.status}` });
    const ct = resp.headers.get('content-type');
    const cd = resp.headers.get('content-disposition');
    if (ct) res.setHeader('Content-Type', ct);
    if (cd) res.setHeader('Content-Disposition', cd);
    resp.body.pipe(res);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// File view — streams blob back to the browser
app.get('/api/proxy/viewFile', requireAuth, async (req, res) => {
  const { path, type } = req.query;
  if (!path) return res.status(400).json({ error: 'Missing path parameter' });
  const codeKey = type === 'nonDtc' ? 'nonDtc' : 'dtcPreview';
  const url = `${API_HOST}/api/fileConnectViewBlobFile?path=${encodeURIComponent(path)}&code=${CODES[codeKey]}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return res.status(resp.status).json({ error: `Azure returned ${resp.status}` });
    const ct = resp.headers.get('content-type');
    const cd = resp.headers.get('content-disposition');
    if (ct) res.setHeader('Content-Type', ct);
    if (cd) res.setHeader('Content-Disposition', cd);
    resp.body.pipe(res);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── Cache management ─────────────────────────────────────────────────────────
app.post('/api/cache/clear', requireAuth, async (req, res) => {
  await Promise.all([
    clearCacheByPattern('dtcAudit:*'),
    clearCacheByPattern('sapAudit:*'),
    clearCacheByPattern('subscriptions:*'),
    clearCacheByPattern('flows:*'),
    clearCacheByPattern('sourceApps:*'),
    clearCacheByPattern('destApps:*'),
    clearCacheByPattern('dropdown:*'),
  ]);
  res.json({ ok: true, message: 'Cache cleared' });
});

app.get('/api/cache/status', requireAuth, (req, res) => {
  res.json({ redis: redisAvailable, url: REDIS_URL });
});

// ─── Health check (no auth — used by load balancers / Azure health probes) ───
app.get('/health', (req, res) => res.json({ status: 'ok', redis: redisAvailable }));

app.listen(PORT, () => {
  console.log(`\n🚀 Proxy server running on http://localhost:${PORT}`);
  console.log(`   Redis : ${REDIS_URL}`);
  console.log(`   Host  : ${API_HOST}`);
  console.log(`   Auth  : session tokens stored in memory\n`);
});
