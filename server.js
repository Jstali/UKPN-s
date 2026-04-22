// Express proxy + auth server for UKPN Audit App
// All Azure API codes and user credentials are read from server-side env vars only —
// they are never sent to the browser.
// Loads variables from .env so `node server.js` works without a launcher.
try { require('dotenv').config(); } catch { /* dotenv optional */ }

const express = require('express');
const cors    = require('cors');
const jwt     = require('jsonwebtoken');
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

// ─── Env validation ──────────────────────────────────────────────────────────
// Fail fast when we can't authenticate users at all. Warn (don't fail) when
// individual Azure function codes are missing — the app still runs, but the
// operator can see exactly which endpoints will return "Azure returned 401".
const REQUIRED_CODES = [
  'dtc','nonDtc','subscription','flows','sourceApp','destApp',
  'appStatus','dropdown','fileStatusSummary','auditEmailExport',
];
const missingCodes = REQUIRED_CODES.filter(k => !CODES[k]);

const missingCore = [];
if (!process.env.JWT_SECRET) missingCore.push('JWT_SECRET');
if (!process.env.USERS)      missingCore.push('USERS');
if (!process.env.API_HOST)   missingCore.push('API_HOST');

if (missingCore.length) {
  console.error(`❌ Missing critical env vars: ${missingCore.join(', ')} — proxy cannot start`);
  console.error('   Generate a JWT secret:  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
  process.exit(1);
}
if (missingCodes.length) {
  console.warn(`⚠️  Missing Azure function codes: ${missingCodes.join(', ')}`);
  console.warn('   Requests to those endpoints will return "Azure returned 401" until set.');
}

// ─── Auth (stateless JWT) ────────────────────────────────────────────────────
// No session store — tokens carry username+role as signed claims. Survives
// any proxy restart. True server-side logout would need a denylist (omitted;
// client-side logout deletes the browser token).
const JWT_SECRET   = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

function getUsers() {
  try { return JSON.parse(process.env.USERS || '[]'); } catch { return []; }
}

function signToken(user) {
  return jwt.sign(
    { username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { username: payload.username, role: payload.role };
    next();
  } catch (e) {
    // TokenExpiredError | JsonWebTokenError | NotBeforeError
    return res.status(401).json({ error: 'Unauthorized', reason: e.name });
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────
// CORS: lock to the configured frontend origin when set; otherwise allow any
// origin in dev. Production deployments MUST set FRONTEND_ORIGIN.
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '';
app.use(cors({
  origin: FRONTEND_ORIGIN || true,
  credentials: true,
}));
app.use(express.json());

// Rejects path values that could enable directory traversal on the upstream
// blob store. Azure does its own ACL checks, but we refuse the obvious cases
// at the edge so they never reach the network.
const isUnsafePath = (p) => {
  if (typeof p !== 'string' || !p) return true;
  if (p.includes('\0')) return true;
  if (p.includes('..')) return true;
  if (p.startsWith('/') || p.startsWith('\\')) return true;
  return false;
};

// ─── Auth routes ──────────────────────────────────────────────────────────────

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = getUsers().find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });
  const token = signToken(user);
  console.log(`[auth] login: ${user.username} (${user.role})`);
  return res.json({ token, username: user.username, role: user.role });
});

// Stateless JWT: server-side logout is a no-op. The client deletes the token
// in AppContext.logout(). Kept as a POST so existing call sites don't break.
app.post('/api/auth/logout', (_req, res) => res.json({ ok: true }));

app.get('/api/auth/me', requireAuth, (req, res) => res.json(req.user));

// ─── Proxy helpers ────────────────────────────────────────────────────────────

// Don't surface upstream 401 as our 401 — that would signal to the browser
// "your JWT is bad, log the user out" when really it's a backend auth issue
// (missing/wrong *_API_CODE). 502 Bad Gateway is the correct status for
// upstream failures: we were fine, the service behind us was not.
const mapUpstreamStatus = (status) => (status === 401 ? 502 : status);

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

    if (!resp.ok) return res.status(mapUpstreamStatus(resp.status)).json({
      error: `Azure returned ${resp.status} ${resp.statusText}`,
      upstreamStatus: resp.status,
    });
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

    if (!resp.ok) return res.status(mapUpstreamStatus(resp.status)).json({
      error: `Azure returned ${resp.status} ${resp.statusText}`,
      upstreamStatus: resp.status,
    });
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
    if (!resp.ok) return res.status(mapUpstreamStatus(resp.status)).json({ error: `Azure returned ${resp.status}`, upstreamStatus: resp.status });
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
  if (isUnsafePath(path)) return res.status(400).json({ error: 'Invalid path' });
  const codeKey = type === 'nonDtc' ? 'nonDtc' : 'dtcDownload';
  const url = `${API_HOST}/api/fileConnectDownloadFileByID?path=${encodeURIComponent(path)}&code=${CODES[codeKey]}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return res.status(mapUpstreamStatus(resp.status)).json({ error: `Azure returned ${resp.status}`, upstreamStatus: resp.status });
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
  if (isUnsafePath(path)) return res.status(400).json({ error: 'Invalid path' });
  const codeKey = type === 'nonDtc' ? 'nonDtc' : 'dtcPreview';
  const url = `${API_HOST}/api/fileConnectViewBlobFile?path=${encodeURIComponent(path)}&code=${CODES[codeKey]}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return res.status(mapUpstreamStatus(resp.status)).json({ error: `Azure returned ${resp.status}`, upstreamStatus: resp.status });
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
// `missingCodes` is empty when fully configured; otherwise it lists the codes
// whose Azure calls will return "Azure returned 401 Unauthorized".
app.get('/health', (_req, res) => res.json({
  status: 'ok',
  redis: redisAvailable,
  missingCodes,
}));

app.listen(PORT, () => {
  console.log(`\n🚀 Proxy server running on http://localhost:${PORT}`);
  console.log(`   Redis : ${REDIS_URL}`);
  console.log(`   Host  : ${API_HOST}`);
  console.log(`   Auth  : stateless JWT (expires in ${JWT_EXPIRES_IN})\n`);
});
