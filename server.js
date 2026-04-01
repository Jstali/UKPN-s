// Express proxy server with Redis caching for Azure Function APIs
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const Redis = require('ioredis');

const app = express();
const PORT = process.env.PROXY_PORT || 4000;

// ─── Redis setup ─────────────────────────────────────────────────────────────
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CACHE_TTL_AUDIT = 300;       // 5 minutes for audit data
const CACHE_TTL_SUBSCRIPTION = 600; // 10 minutes for subscriptions

let redis = null;
let redisAvailable = false;

function connectRedis() {
  redis = new Redis(REDIS_URL, {
    connectTimeout: 3000,
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    enableOfflineQueue: false,
  });
  redis.on('connect', () => { redisAvailable = true; console.log('✅ Redis connected'); });
  redis.on('error', (err) => {
    if (redisAvailable) console.warn('⚠️  Redis unavailable, running without cache:', err.message);
    redisAvailable = false;
  });
  redis.connect().catch(() => {});
}
connectRedis();

// ─── Cache helpers ────────────────────────────────────────────────────────────
async function getCache(key) {
  if (!redisAvailable) return null;
  try {
    const val = await redis.get(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
}

async function setCache(key, data, ttl) {
  if (!redisAvailable) return;
  try { await redis.set(key, JSON.stringify(data), 'EX', ttl); } catch {}
}

async function clearCacheByPattern(pattern) {
  if (!redisAvailable) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length) await redis.del(...keys);
  } catch {}
}

// ─── Azure API constants ──────────────────────────────────────────────────────
const API_HOST = 'https://fadev-im-fileconnect-frontend-uks03.azurewebsites.net';
const API_CODE         = process.env.REACT_APP_DTC_API_CODE         || 'REDACTED_DTC_API_CODE_V2=';
const SAP_API_CODE     = process.env.REACT_APP_SAP_API_CODE         || 'REDACTED_SAP_API_CODE_V2=';
const SUBSCRIPTION_CODE = process.env.REACT_APP_SUBSCRIPTION_CODE   || 'REDACTED_SUBSCRIPTION_CODE=';

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Generic proxy + cache helper ────────────────────────────────────────────
async function proxyWithCache(req, res, azureUrl, cacheKeyPrefix, ttl) {
  const pageSize = req.query.pageSize || 100;
  const token = req.query.continuationToken || '';
  const cacheKey = `${cacheKeyPrefix}:${pageSize}:${token}`;

  // 1. Try cache first
  const cached = await getCache(cacheKey);
  if (cached) {
    console.log(`[cache HIT] ${cacheKey}`);
    return res.json({ ...cached, fromCache: true });
  }

  // 2. Fetch from Azure
  try {
    let url = `${azureUrl}&pageSize=${pageSize}`;
    if (token) url += `&continuationToken=${encodeURIComponent(token)}`;

    console.log(`[cache MISS] fetching ${url}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(response.status).json({ error: `Azure API returned ${response.status} ${response.statusText}` });
    }

    const data = await response.json();
    await setCache(cacheKey, data, ttl);
    return res.json(data);
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'Request timed out after 15s' });
    }
    console.error('Proxy error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// DTC Audit
app.get('/api/proxy/dtcAudit', (req, res) => {
  const url = `${API_HOST}/api/dtcAuditApi?code=${API_CODE}`;
  return proxyWithCache(req, res, url, 'dtcAudit', CACHE_TTL_AUDIT);
});

// Non-DTC / SAP Audit
app.get('/api/proxy/sapAudit', (req, res) => {
  const url = `${API_HOST}/api/sapAuditApi?code=${SAP_API_CODE}`;
  return proxyWithCache(req, res, url, 'sapAudit', CACHE_TTL_AUDIT);
});

// Subscriptions
app.get('/api/proxy/subscriptions', async (req, res) => {
  const cacheKey = 'subscriptions:all';
  const cached = await getCache(cacheKey);
  if (cached) {
    console.log(`[cache HIT] ${cacheKey}`);
    return res.json({ ...cached, fromCache: true });
  }
  try {
    const url = `${API_HOST}/api/dtcSubscriptionAPI?code=${SUBSCRIPTION_CODE}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return res.status(response.status).json({ error: `Azure returned ${response.status}` });
    const data = await response.json();
    await setCache(cacheKey, data, CACHE_TTL_SUBSCRIPTION);
    return res.json(data);
  } catch (error) {
    if (error.name === 'AbortError') return res.status(504).json({ error: 'Timed out' });
    return res.status(500).json({ error: error.message });
  }
});

// Cache invalidation (call after data changes)
app.post('/api/cache/clear', async (req, res) => {
  await clearCacheByPattern('dtcAudit:*');
  await clearCacheByPattern('sapAudit:*');
  await clearCacheByPattern('subscriptions:*');
  res.json({ ok: true, message: 'Cache cleared' });
});

// Cache status
app.get('/api/cache/status', (req, res) => {
  res.json({ redis: redisAvailable, url: REDIS_URL });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', redis: redisAvailable });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Proxy server running on http://localhost:${PORT}`);
  console.log(`   Redis: ${REDIS_URL}`);
  console.log(`   DTC Audit cache TTL: ${CACHE_TTL_AUDIT}s`);
  console.log(`   Subscription cache TTL: ${CACHE_TTL_SUBSCRIPTION}s\n`);
});
