# Handoff Prompt — Fix All Issues in UKPN Audit App

Copy everything below this line into the chat with your AI coding assistant (Claude Code / Cursor / etc.). It is self-contained: it describes the app, the rules, every finding, the exact fix, and the verification steps.

---

## Context

You are fixing a React 19 + CRA client with an Express proxy server for the "UKPN Audit App" (internal audit dashboard for DTC and Non-DTC file flows, backed by Azure Functions + Redis).

Repository root: the one containing `package.json`, `server.js`, `src/`, and `public/`.
A full review lives at `CODE_REVIEW.md` in the repo root — read it first for the narrative and line references.

### Ground rules
1. **Zero errors, optimized code.** Every fix must compile and pass `npm run build` with no new warnings. If ESLint already has warnings, don't add more.
2. **Do not change public behavior** except where the finding explicitly requires it (e.g. moving auth server-side).
3. **Preserve the data shapes** returned by services — pages, hooks, and `AppContext` expect the existing field names.
4. **One logical change per commit.** Commit messages: `fix(scope): short description (S1-1)` etc.
5. **After every edit, re-read the file** to confirm the change applied cleanly. Never assume.
6. **Test plan at the end** — run `npm run build` and `npm test` (there is `src/components/__tests__/DtcFilterDropdown.test.jsx` and `src/utils/__tests__/performanceUtils.test.js`). Fix any regressions.
7. **Do not introduce new dependencies** unless the fix explicitly names one.
8. **Use `nullish coalescing (??)` instead of `||`** whenever you are guarding "missing value" — `||` incorrectly falls back on `0`, `false`, `""`.

### Key architectural facts to know before you start
- `server.js` (Express, port 4000) already has: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `requireAuth` middleware, `/api/proxy/dtcAudit`, `/api/proxy/sapAudit`, `/api/proxy/dtcAuditCount`, `/api/proxy/subscriptions`, `/api/proxy/flows`, `/api/proxy/sourceApps`, `/api/proxy/destApps`, `/api/proxy/dropdown`, `/api/proxy/appStatus`, `/api/proxy/fileStatusSummary`, `/api/proxy/auditEmailExport` (POST), `/api/proxy/downloadFile`, `/api/proxy/viewFile`, `/api/cache/clear`, `/api/cache/status`, `/health`. All proxy routes (except `/health`) require a valid session token.
- The client is currently bypassing this proxy entirely — that is the main fix.
- React 19 with StrictMode enabled (`src/index.js:8`).
- Routing uses `HashRouter` (`src/App.js:2`) — keep this for now unless an S3 fix below changes it.
- Env vars: proxy reads unprefixed (`DTC_API_CODE`, `USERS`, `API_HOST`, `REDIS_URL`), React client should only read `REACT_APP_API_URL` (the proxy base URL) — nothing else.

---

## Fix list — execute in this order

### BATCH 1 — Security & wiring (S1-1, S1-2, S1-3, S2-6) — do these together as one change

**Goal:** the client never talks to Azure directly, never holds API codes, and never holds a user list.

1. **Delete `API_CODES` and `ENDPOINTS` from `src/constants/apiConfig.js`.** Keep only: `API_BASE`, `AUDIT_TIMEOUT_MS`, `DTC_PAGE_SIZE`, `NON_DTC_PAGE_SIZE`, `AUDIT_PAGE_SIZE`. The file should be ~10 lines.

2. **Rewrite `src/services/apiService.js` to call the proxy.** Every URL becomes `${API_BASE}/api/proxy/<route>`. Replace each hard URL:
   - `ENDPOINTS.dtcAudit` → `${API_BASE}/api/proxy/dtcAudit`
   - `ENDPOINTS.dtcAuditCount` → `${API_BASE}/api/proxy/dtcAuditCount`
   - `ENDPOINTS.nonDtcAudit` → `${API_BASE}/api/proxy/sapAudit`
   - `ENDPOINTS.subscription` → `${API_BASE}/api/proxy/subscriptions`
   - `ENDPOINTS.flows` → `${API_BASE}/api/proxy/flows`
   - `ENDPOINTS.sourceApps` → `${API_BASE}/api/proxy/sourceApps`
   - `ENDPOINTS.destApps` → `${API_BASE}/api/proxy/destApps`
   - `ENDPOINTS.appStatus` → `${API_BASE}/api/proxy/appStatus`
   - `ENDPOINTS.dropdownValues` → `${API_BASE}/api/proxy/dropdown`
   - `ENDPOINTS.fileStatusSummary` → `${API_BASE}/api/proxy/fileStatusSummary`
   - `ENDPOINTS.auditEmailExport` → `${API_BASE}/api/proxy/auditEmailExport` (keep as POST)
   - `ENDPOINTS.downloadFile` → `${API_BASE}/api/proxy/downloadFile` (pass `path` + `type=dtc|nonDtc` as query params — proxy handles the code)
   - `ENDPOINTS.viewFile` → `${API_BASE}/api/proxy/viewFile` (same shape)
   - Remove `API_CODES` usage from `fetchFileResponse` entirely — proxy chooses the code based on `type`.

3. **Add a fetch wrapper that attaches `Authorization: Bearer <token>`** to every request. Create `src/services/apiClient.js`:
   ```js
   import { API_BASE } from '../constants/apiConfig';
   const tokenKey = 'authToken';
   export const getToken = () => sessionStorage.getItem(tokenKey);
   export const setToken = (t) => sessionStorage.setItem(tokenKey, t);
   export const clearToken = () => sessionStorage.removeItem(tokenKey);
   export const authFetch = (path, opts = {}) => {
     const token = getToken();
     const headers = { ...(opts.headers || {}) };
     if (token) headers.Authorization = `Bearer ${token}`;
     return fetch(`${API_BASE}${path}`, { ...opts, headers });
   };
   export const login = async (username, password) => {
     const res = await fetch(`${API_BASE}/api/auth/login`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ username, password }),
     });
     if (!res.ok) throw new Error((await res.json()).error || 'Login failed');
     const data = await res.json();
     setToken(data.token);
     return { username: data.username, role: data.role };
   };
   export const logout = async () => {
     try { await authFetch('/api/auth/logout', { method: 'POST' }); } catch {}
     clearToken();
   };
   ```
   Then update `fetchJson` and `fetchAuditPage` in `src/services/fetchUtils.js` to call `authFetch` instead of raw `fetch`. On any `401` response, clear the token, dispatch a `window` event `auth:expired`, and have `AppContext` listen + force logout.

4. **Rewrite `src/pages/Login.jsx`** to call `login(username, password)` from the new `apiClient.js`. Remove the entire `const users = JSON.parse(process.env.REACT_APP_USERS || '[]')` block. On success call `onLogin(userObj)` and navigate to `/`. On failure show the returned error message.

5. **Update `src/context/AppContext.js`** `login`/`logout` callbacks to delegate to the helpers from `apiClient.js` (`logout` must call the server endpoint before clearing local state). Already stores `sessionStorage.user`; also persist `authToken` there (done by `setToken`).

6. **Delete every `REACT_APP_*_API_CODE` and `REACT_APP_USERS` from `.env.example`.** The template already omits them, but confirm. Only `REACT_APP_API_URL` should remain for the client.

7. **Add CORS allowlist to `server.js`.** Replace `app.use(cors())` at line 92 with:
   ```js
   const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
   app.use(cors({ origin: (o, cb) => !o || ALLOWED_ORIGINS.includes(o) ? cb(null, true) : cb(new Error('CORS blocked')), credentials: true }));
   ```
   Add `ALLOWED_ORIGINS=http://localhost:3000` to `.env.example`.

8. **Verify.** Grep the `src/` tree for `REACT_APP_DTC`, `REACT_APP_USERS`, `azurewebsites.net` — all must return zero hits. `process.env.REACT_APP_API_URL` may remain.

### S2-1 — Fix `parseHHMMSS` unit bug
`src/utils/performanceUtils.js:29`. Change `return ms === null ? null : ms * 1000;` to `return ms === null ? null : ms / 1000;`. The JSDoc on line 24 says "total seconds (float)" — match that. Update or add a test in `src/utils/__tests__/performanceUtils.test.js` for `parseHHMMSS('00:01:05') === 65` and `parseHHMMSS('00:00:00.507') === 0.507`.

### S2-2 — Strip `console.*` from production
Install `babel-plugin-transform-remove-console` as a devDependency. Add a `babel.macros.config.js` or, simpler, install `@craco/craco` and wire a craco config that enables the plugin only when `NODE_ENV === 'production'`. Keep `console.error` (the plugin has an `exclude: ['error']` option — use it). Update `package.json` scripts: `start: craco start`, `build: craco build`, `test: craco test`.
Alternatively, without craco: manually delete the 31 `console.*` calls from these files, keeping only `console.error` in `ErrorBoundary.jsx`:
`src/pages/DtcAuditFilter.jsx`, `src/components/DataTable.jsx`, `src/pages/DtcFailedFiles.jsx`, `src/services/apiService.js`, `src/utils/exportUtils.js`, `src/services/fetchUtils.js`, `src/utils/storageUtils.js`.
`src/services/apiService.js:70` logs the email-export payload — this must go (payload contains recipient emails).

### S2-3 — Cap the Non-DTC background pagination loop
`src/context/AppContext.js` lines 197–206. Replace the `while` loop with:
```js
const MAX_NON_DTC_PAGES = 200;
const seenTokens = new Set();
let pagesLoaded = 1;
let nonDtcToken = nonDtcFirst?.continuationToken || null;
while (nonDtcToken && !controller.signal.aborted && pagesLoaded < MAX_NON_DTC_PAGES) {
  if (seenTokens.has(nonDtcToken)) { console.error('[AppContext] duplicate continuationToken — breaking loop'); break; }
  seenTokens.add(nonDtcToken);
  const page = await api.fetchNonDtcAuditData(nonDtcToken, NON_DTC_PAGE_SIZE, { signal: controller.signal });
  if (controller.signal.aborted) break;
  const newRows = Array.isArray(page?.data) ? page.data : [];
  nonDtcRecords.push(...newRows);
  nonDtcToken = page?.continuationToken || null;
  pagesLoaded += 1;
  if (newRows.length > 0 && pagesLoaded % 5 === 0) commitNonDtcData([...nonDtcRecords]);
}
commitNonDtcData([...nonDtcRecords]); // final flush
```

### S2-4 — Fix StrictMode × mountedRef race
`src/context/AppContext.js:269–283`. Remove the `mountedRef.current` guard entirely; rely on `isFetchingRef.current` (already present at line 148). The initial-fetch effect becomes:
```js
useEffect(() => {
  const hasCachedData = readCache(DTC_CACHE_KEY).length > 0;
  fetchAllData({ silent: hasCachedData });
  fetchSubscriptions();
  fetchFlowsData();
  fetchFileStatus();
  return () => { if (activeControllerRef.current) activeControllerRef.current.abort(); };
}, [fetchAllData, fetchSubscriptions, fetchFlowsData, fetchFileStatus]);
```
Also delete the `mountedRef` declaration on line 81.

### S2-5 — Server-validate role on privileged UI
Expose a `/api/auth/me` call after login — it already exists server-side (`server.js:118`). In `AppContext.js` on rehydrate (`useEffect` at line 86), call `authFetch('/api/auth/me')`; on non-200, clear session and user. Role-based UI stays as-is but is now trustworthy because the token is server-validated.

### S2-7 — Add timeout to `fetchFileResponse`
`src/services/apiService.js:94–112`. Reuse the existing helper:
```js
import { withTimeoutSignal } from './fetchUtils';
const fetchFileResponse = async (apiEndpoint, path, codeKey) => {
  const cleanPath = String(path || '').trim();
  if (!cleanPath) throw new Error('Missing file path');
  const type = codeKey === 'nonDtc' ? 'nonDtc' : 'dtc';
  const url = `${apiEndpoint}?path=${encodeURIComponent(cleanPath)}&type=${type}`;
  const tc = withTimeoutSignal(undefined, 30_000);
  try {
    const res = await authFetch(url.replace(API_BASE, ''), { method: 'GET', signal: tc.signal });
    if (!res.ok) throw new Error((await res.text().catch(() => '')) || `Request failed with status ${res.status}`);
    // ... rest unchanged
  } finally { tc.cleanup(); }
};
```

### S2-8 — Stabilise `useAuditFilters`
`src/hooks/useAuditFilters.js:13,20-21,24-37`. Two changes:
- Replace the parameter default `dataDeps = []` with `dataDeps` and document "caller must memoise with useMemo".
- Move `applyFnRef.current = applyFn;` out of render into `useEffect(() => { applyFnRef.current = applyFn; })`.
- Use `applyFnRef.current(saved)` inside the effect at line 32 for consistency.
- Keep the `eslint-disable` comment but add an explanation: `// dataDeps is the intentional dep list supplied by the caller`.

### S2-9 — Fix Home timestamp thrash
`src/pages/Home.jsx:41–45`. The effect fires on every Non-DTC background page. Replace with one-shot timestamp:
```js
const { dataComplete } = useApp(); // add to useApp() destructure at line 19
React.useEffect(() => {
  if (dataComplete) setDashboardUpdatedAt(new Date().toLocaleTimeString());
}, [dataComplete]);
```

### S3-1 — Split `DataTable.jsx`
1,219 lines. Extract into `src/components/dataTable/` folder:
- `index.jsx` (main `DataTable` wrapper, <200 lines — orchestrates state and composition)
- `Toolbar.jsx` (search input, export dropdown, view-all toggle, email button)
- `HeaderRow.jsx` (column headers, sort, resize, drag-reorder)
- `Row.jsx` (memoised with `React.memo` — single row rendering)
- `ColumnFilterPopover.jsx` (already nested inside DataTable — lift to its own file)
- `Pagination.jsx` (page controls and size selector)
- `useColumnOrder.js` (drag-reorder + localStorage persistence hook)
- `useColumnWidths.js` (resize hook)
- `dataTable.module.css` (all inline styles lifted here)
Keep the public API identical — existing imports `import DataTable from '../components/DataTable'` must continue to work via a re-export shim.

### S3-2 — Delete dead files
```
rm src/components/DtcFilterDropdown_old.jsx
rm src/data/ADMS_DEV_V1.js
rm src/data/MPRS_DEV_V1.js
rm src/data/Electralink_DEV_V1.js
rm src/data/Audit_Data_Dummy.js
rm src/data/mockData.js
rm "src/data/application subscription.js"
```
After removing, run `grep -r ADMS_DEV_V1 src/` and confirm the only hit is the placeholder string in `src/pages/Subscriptions.jsx:653` (safe — it's a UI placeholder, not an import).

### S3-3 — Lazy-load heavy export libs
`src/utils/exportUtils.js:1–3`. Replace top-level imports with dynamic imports inside each export function:
```js
export const exportToPDF = async (data, columns, filename, title, options = {}) => {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  // ... existing body
};
export const exportToExcel = async (data, columns, filename, sheetName) => {
  const XLSX = await import('xlsx');
  // ... existing body
};
```
Every caller (`DataTable.jsx`, `Home.jsx`, etc.) must `await` the export function now. Grep for `exportToPDF(`, `exportToExcel(`, `exportToCSV(` and make each call site `await`.

### S3-4 — Switch `HashRouter` → `BrowserRouter`
`src/App.js:2`. `import { BrowserRouter as Router, ... }`. Confirm `public/staticwebapp.config.json` has a fallback route (it does — `"route": "/*"`). For GitHub Pages (`homepage: "."` in `package.json:5`), add a `basename={process.env.PUBLIC_URL}` to the `<Router>`.
If the deployment target doesn't support history fallback, skip this and file a follow-up.

### S3-5 — Wire telemetry into ErrorBoundary
`src/components/ErrorBoundary.jsx:13–18`. Decide: either add Sentry (`npm i @sentry/react @sentry/tracing`) and `Sentry.captureException(error, { extra: errorInfo })` in `componentDidCatch`, OR POST the error to a new `/api/telemetry/error` endpoint on `server.js` that logs to disk. Also add in `src/index.js`:
```js
window.addEventListener('unhandledrejection', e => console.error('Unhandled promise rejection:', e.reason));
```

### S3-6 — Reconcile AAD vs local login
`public/staticwebapp.config.json` requires `"authenticated"` users (AAD). The client form uses local username/password. Pick one:
- **Option A (local login, recommended for now):** delete `public/staticwebapp.config.json` or remove the `auth` and `routes` blocks. Document that auth is server-side via the Express proxy.
- **Option B (AAD):** delete `Login.jsx`, delete `login`/`logout` from `AppContext`, and use SWA's `/.auth/me` endpoint in `AppContext` on mount.
Choose A; file a follow-up ticket for B.

### S3-7 — Replace imperative hover styles with CSS
Grep for `onMouseEnter={(e) => (e.currentTarget.style` across `src/`. Replace each with a `className` + a matching `:hover` rule in a `.module.css`. Priority files: `DataTable.jsx`, `DtcFilterDropdown.jsx`, `App.js` (banner dismiss button).

### S3-8 — Replace `|| ''` with `?? ''` for values
Grep for `|| ''` and evaluate each case. Safe bulk replacements:
- `String(row[col.key] || '')` → `String(row[col.key] ?? '')`
- `row.foo || ''` → `row.foo ?? ''`
Don't change comparisons like `status || 'Unknown'` where falsy-collapse to the default is desired.

### S3-9 — Fix timezone bug in `dateUtils`
`src/utils/dateUtils.js:18–28`. Document the contract: input strings are ISO YYYY-MM-DD representing UTC days. Rewrite:
```js
export const isDateInRange = (itemDate, startDate, endDate) => {
  const item = new Date(itemDate);
  if (startDate) {
    const start = new Date(startDate); start.setUTCHours(0, 0, 0, 0);
    if (item < start) return false;
  }
  if (endDate) {
    const end = new Date(endDate); end.setUTCHours(23, 59, 59, 999);
    if (item > end) return false;
  }
  return true;
};
```
Leave `combineDateTime` alone but add a JSDoc note that the string is local-TZ interpreted unless a `Z` is supplied.

### S3-10 — ID filter semantics
`src/utils/dtcFilterUtils.js:44`. The `msgId` filter uses `.includes()`. Either (a) change to exact match: `filtered = filtered.filter(r => r.eventId && String(r.eventId) === String(filters.msgId));` and update the label/placeholder in `DtcAuditFilter.jsx` to "Message ID (exact)", or (b) keep substring but change the UI label to "Message ID contains…". Choose (a).

### S3-11 — Scope `ClickSpark`
`src/App.js:151–157`. Wrap only `<Home>` and simple pages, not `DataTable`-heavy pages. Simplest: move `<ClickSpark>` into `src/pages/Home.jsx` around its outermost div, delete it from `App.js`.

### S3-12 — `onPageChange` stale-closure guard
`src/components/DataTable.jsx:266–268`. Either add `onPageChange` to the deps (safe if the parent passes a stable callback), or wire through a ref:
```js
const onPageChangeRef = useRef(onPageChange);
useEffect(() => { onPageChangeRef.current = onPageChange; });
useEffect(() => { onPageChangeRef.current?.(currentPage, pageSize); }, [currentPage, pageSize]);
```

### S3-13 — Preserve continuation token when user has loaded more
`src/context/AppContext.js:179–191`. Guard all token-mutating writes:
```js
const userHasLoadedMore = auditDataRef.current.length > dtcRecords.length;
if (!userHasLoadedMore) {
  commitAuditData(dtcRecords);
  setDtcHasMore(dtcFirst?.hasMore ?? !!dtcFirst?.continuationToken);
  setDtcContinuationToken(dtcFirst?.continuationToken || null);
  setDtcPageMeta({ ...dtcFirst, resultCount: dtcRecords.length });
}
```
Leave meta untouched when `userHasLoadedMore` is true.

### S3-14 — Surface storage corruption once
`src/utils/storageUtils.js:4–11`. Keep the try/catch but add one-shot warnings using a module-level Set:
```js
const warned = new Set();
const read = (storage, key, defaultValue = null) => {
  try { ... }
  catch (e) {
    if (!warned.has(key)) {
      warned.add(key);
      console.error(`[storage] read failed for "${key}":`, e.message);
    }
    return defaultValue;
  }
};
```
Same pattern in `write`.

### S3-15 — Keyboard support on clickable divs
For each `<div onClick={...}>` in `DataTable.jsx`, `DtcFilterDropdown.jsx`, `Home.jsx` (dashboard cards), add `role="button"`, `tabIndex={0}`, and an `onKeyDown` that triggers the same handler on Enter/Space:
```jsx
const activate = (fn) => (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } };
<div role="button" tabIndex={0} onClick={() => doX()} onKeyDown={activate(() => doX())}>...</div>
```
Better: convert the most clicked ones into `<button>` elements.

### S3-16 — `aria-label` on icon buttons
Grep for `lucide-react` imports inside JSX returning naked icons with `onClick`. Add `aria-label` on every parent `<button>`:
```jsx
<button aria-label="Download" onClick={...}><Download size={16} /></button>
```
Apply across `DataTable.jsx` toolbar, `App.js:82–95` dismiss button, header nav.

### S3-17 — Better error surfacing
With the proxy wiring in place, 401 will be distinct (triggering `auth:expired`). Additionally in `App.js` banner (line 37–45) surface distinct labels: "Session expired — please sign in again", "Azure is returning 5xx", "network error", based on `fetchError.message`.

### S4 polish (do last, as one batch if possible)
- **S4-1** `DataTable.jsx` `uniqueValues` memo: key off `data` (the unfiltered prop), not the derived filtered view.
- **S4-2** `framer-motion`: evaluate removing. Replace `motion.div` with CSS keyframe classes (`@keyframes fadeSlideUp`). If you keep it, lazy-load the `motion` subpath.
- **S4-3** Extract `App.js` banner inline styles to `.module.css`.
- **S4-4** Persist `columnFilters` in `sessionStorage` on `DataTable.jsx` alongside `dataTablePage`/`dataTablePageSize`.
- **S4-5** `Analytics.jsx:47` `gridTemplateColumns` — add a `@media (max-width: 768px)` override to stack.
- **S4-6** `Home.jsx:50` `NON_DTC_DELIVERED_STATUSES` — move to module scope (before `const Home = () => {`).
- **S4-7** `package.json` — remove `node-fetch` dependency; Node 18+ has global `fetch`. Delete `const fetch = require('node-fetch')` at top of `server.js`.
- **S4-8** CRA → Vite migration. File as a follow-up ticket; don't do it in the same PR as everything else. When done: `npm i -D vite @vitejs/plugin-react`, `index.html` moves to root, `src/index.js` becomes `src/main.jsx`, remove `react-scripts`, update scripts.
- **S4-9** `useDebounce` — optional: switch to `use-debounce` package for `cancel`/`flush`. Not urgent.
- **S4-10** `App.js:20–34` — collapse the two useEffects into one keyed on `activeError`; drop the `visibleError` state.

---

## Verification checklist (run after every batch)

1. `npm run build` — passes with no new warnings.
2. `npm test -- --watchAll=false` — passes.
3. `grep -r "REACT_APP_DTC" src/` — empty.
4. `grep -r "REACT_APP_USERS" src/` — empty.
5. `grep -r "azurewebsites.net" src/` — empty.
6. `grep -rn "console.log" src/` — zero hits (or zero non-error hits).
7. `grep -rn "process.env.REACT_APP_" src/` — the only surviving reference should be `REACT_APP_API_URL` and `PUBLIC_URL`.
8. Start the proxy: `npm run proxy-server` (requires `.env` with `DTC_API_CODE`, `USERS`, `API_HOST`, `REDIS_URL`).
9. Start the client: `npm start`.
10. Log in via the form, confirm the Network tab shows requests to `http://localhost:4000/api/proxy/*` with an `Authorization: Bearer …` header, NOT to `azurewebsites.net`.
11. Stop the proxy and reload the app — the warning banner appears; the "Retry" button is visible.
12. Trigger an export (PDF, Excel) — first click shows a brief lazy-load delay, then the download works.
13. Load a page with >1,000 rows — `DataTable` still scrolls smoothly after the split.
14. DevTools → Application → Session Storage: `authToken` and `user` are present; after logout both are gone.
15. View the production bundle: `npm run build` then `grep -r "password" build/static/js/` — zero hits.

---

## Deliverable

Open one PR titled `fix: full code-review remediation (S1–S3 + selected S4)`. In the PR body, include the severity table from `CODE_REVIEW.md` with ✅ next to each item fixed, and a bullet list of items deferred to follow-up tickets (with issue links). Attach a short Loom-style screen recording or markdown summary of the before/after behavior for S1 (security wiring) and S3-1 (DataTable split).
