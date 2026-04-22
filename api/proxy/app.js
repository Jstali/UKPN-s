// Express proxy + auth server for UKPN Audit App — shared between local dev
// (`node server.js` from repo root) and the SWA Managed Function at
// `api/proxy/index.js`. Holds every route and middleware definition; exports
// the ready-to-serve Express app. No `app.listen()` here — that's the
// caller's job (local server.js listens on a port; the Function adapter
// translates one HTTP request at a time).

const express = require('express');
const cors    = require('cors');
const jwt     = require('jsonwebtoken');
const fetch   = require('node-fetch');
// Redis is optional — only connected if REDIS_URL resolves. On SWA Managed
// Functions there's typically no accessible Redis, so caching is skipped.
let Redis; try { Redis = require('ioredis'); } catch { Redis = null; }

const app = express();

// ─── Redis setup (optional) ───────────────────────────────────────────────
const REDIS_URL       = process.env.REDIS_URL || '';
const CACHE_TTL_AUDIT = 300;   // 5 min — paginated audit data
const CACHE_TTL_REF   = 600;   // 10 min — reference / dropdown data

let redis          = null;
let redisAvailable = false;

if (Redis && REDIS_URL) {
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
} else {
  console.log('ℹ️  Running without Redis cache (REDIS_URL not set or ioredis unavailable)');
}

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

// ─── Azure upstream ──────────────────────────────────────────────────────
const API_HOST = process.env.API_HOST || '';

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

const az = (path, codeKey) => `${API_HOST}${path}?code=${CODES[codeKey]}`;

// ─── Env validation (non-fatal) ──────────────────────────────────────────
// Don't exit on missing vars — the SWA Managed Function would restart-loop.
// Instead, expose the problem via /health + a 503 middleware so callers see
// a clear error. The local-dev wrapper (server.js) does its own exit-if-missing
// check so developers can't silently run with half an env.
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
  console.error(`❌ Missing critical env vars: ${missingCore.join(', ')}`);
}
if (missingCodes.length) {
  console.warn(`⚠️  Missing Azure function codes: ${missingCodes.join(', ')}`);
  console.warn('   Requests to those endpoints will return "Azure returned 401" until set.');
}

// ─── Auth (stateless JWT) ────────────────────────────────────────────────
const JWT_SECRET     = process.env.JWT_SECRET;
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
  // SWA linked-backend principal (kept for backward compatibility)
  const principalHeader = req.headers['x-ms-client-principal'];
  if (principalHeader) {
    try {
      const decoded   = Buffer.from(principalHeader, 'base64').toString('utf-8');
      const principal = JSON.parse(decoded);
      if (principal && principal.userDetails) {
        req.user = {
          username:   principal.userDetails,
          role:       'Admin',
          authMethod: 'aad',
        };
        return next();
      }
    } catch { /* fall through to JWT path */ }
  }

  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { username: payload.username, role: payload.role, authMethod: 'jwt' };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized', reason: e.name });
  }
}

// ─── Global middleware ───────────────────────────────────────────────────
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '';
app.use(cors({
  origin: FRONTEND_ORIGIN || true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// 503 any request other than /health if core env vars are missing. Makes
// configuration mistakes surface immediately instead of deep in a route.
app.use((req, res, next) => {
  if (missingCore.length && req.path !== '/health' && req.path !== '/api/health') {
    return res.status(503).json({
      error: 'Service not fully configured',
      missing: missingCore,
      hint: 'Set the listed environment variables on the Azure Static Web App app settings.',
    });
  }
  next();
});

const isUnsafePath = (p) => {
  if (typeof p !== 'string' || !p) return true;
  if (p.includes('\0')) return true;
  if (p.includes('..')) return true;
  if (p.startsWith('/') || p.startsWith('\\')) return true;
  return false;
};

// ─── Auth routes ─────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = getUsers().find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });
  const token = signToken(user);
  console.log(`[auth] login: ${user.username} (${user.role})`);
  return res.json({ token, username: user.username, role: user.role });
});

app.post('/api/auth/logout', (_req, res) => res.json({ ok: true }));

app.get('/api/auth/me', requireAuth, (req, res) => res.json(req.user));

// ─── Proxy helpers ───────────────────────────────────────────────────────
const mapUpstreamStatus = (status) => (status === 401 ? 502 : status);

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

// ─── Proxy routes ────────────────────────────────────────────────────────
app.get('/api/proxy/dtcAudit',    requireAuth, (req, res) =>
  proxyWithCache(req, res, az('/api/fileconnectDtcAuditData',        'dtc'),    'dtcAudit', CACHE_TTL_AUDIT));
app.get('/api/proxy/sapAudit',    requireAuth, (req, res) =>
  proxyWithCache(req, res, az('/api/fileconnectNonDtcAuditData',     'nonDtc'), 'sapAudit', CACHE_TTL_AUDIT));

app.get('/api/proxy/dtcAuditCount', requireAuth, (req, res) =>
  proxySimple(req, res, az('/api/fileconnectDtcAuditDocumentCount', 'dtc'), null, 0));

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

app.get('/api/proxy/appStatus',         requireAuth, (req, res) =>
  proxySimple(req, res, az('/api/fileconnectApplicationStatus',  'appStatus'),         null, 0));
app.get('/api/proxy/fileStatusSummary', requireAuth, (req, res) =>
  proxySimple(req, res, az('/api/fileconnectFileStatusSummary',  'fileStatusSummary'), null, 0));

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
    // Buffer the response — azure-function-express needs the full body before
    // it can build the HTTP response envelope (streaming isn't supported for
    // the SWA Managed Function path). This loses incremental downloads but
    // is fine for the blob sizes we proxy.
    const buf = Buffer.from(await resp.arrayBuffer());
    res.send(buf);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

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
    const buf = Buffer.from(await resp.arrayBuffer());
    res.send(buf);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── Cache management ────────────────────────────────────────────────────
app.post('/api/cache/clear', requireAuth, async (_req, res) => {
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

app.get('/api/cache/status', requireAuth, (_req, res) => {
  res.json({ redis: redisAvailable, url: REDIS_URL });
});

// ─── Health (no auth) ────────────────────────────────────────────────────
const healthHandler = (_req, res) => res.json({
  status: missingCore.length ? 'degraded' : 'ok',
  redis: redisAvailable,
  missingCore,
  missingCodes,
});
app.get('/health',     healthHandler);
app.get('/api/health', healthHandler);  // alias — reachable via SWA's /api/* routing

module.exports = app;
