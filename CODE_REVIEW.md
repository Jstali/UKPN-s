# UKPN Audit App — Code Review

Review date: 2026-04-22
Scope: full application (React 19 + CRA client, Express proxy server, 90+ source files).
Method: direct read of entry/infra files + thorough survey of pages, components, utils, hooks, config. All line references were verified against the source before being included.

Severity key: **S1** block release, **S2** fix before next prod push, **S3** fix in the next sprint, **S4** polish/nice-to-have.

---

## Executive summary

The code is organised and reasonably well-structured — AppContext centralises data, services are split, utils are shared, and there is a working Express proxy (`server.js`) that properly hides Azure function codes, authenticates via session tokens, and caches with Redis.

**The biggest problem is that the React client does not use that proxy.** The browser calls Azure directly with function codes baked into URLs, and authentication is done entirely client-side against a user list shipped inside the JavaScript bundle. The proxy's security, caching, and auth middleware provide zero protection in the current wiring.

After that, the main recurring themes are: scattered `console.log` calls in production code, a very large `DataTable.jsx` (1,219 lines), heavy libraries loaded eagerly, several dead files, and a handful of subtle hook/closure bugs.

Counts by severity: S1 = 3, S2 = 9, S3 = 17, S4 = 10.

---

## S1 — Release blockers

### S1-1. Credentials are shipped to every browser
`src/pages/Login.jsx:16`
```js
const users = JSON.parse(process.env.REACT_APP_USERS || '[]');
```
Any env var prefixed `REACT_APP_` is inlined into the production JS bundle by `react-scripts build`. The comment on line 13–15 explicitly says "never commit .env to version control" — that does not matter, because the values get baked into `/static/js/main.*.js` on build. Anyone with a browser can open DevTools → Sources and read every username, plain-text password, and role.

`server.js` already has a correct `/api/auth/login` endpoint (line 97) that validates against `process.env.USERS` server-side, issues a random session token, and exposes `requireAuth` middleware. The client needs to call that endpoint and stop reading `REACT_APP_USERS`.

Fix: remove `REACT_APP_USERS` entirely from the client. `Login.jsx` should `POST /api/auth/login` through the proxy, persist the returned `token` in `sessionStorage`, and attach it as `Authorization: Bearer <token>` on subsequent calls.

### S1-2. Azure function codes are shipped to every browser
`src/constants/apiConfig.js:4–38`
```js
const HOST = process.env.REACT_APP_API_HOST || '...azurewebsites.net';
const code = (envKey) => process.env[envKey] || '';
export const API_CODES = { dtc: code('REACT_APP_DTC_API_CODE'), ... };
const endpoint = (path, codeKey) => `${HOST}${path}?code=${API_CODES[codeKey]}`;
export const ENDPOINTS = { dtcAudit: endpoint('/api/fileconnectDtcAuditData', 'dtc'), ... };
```
Same mechanism as S1-1: every Azure function code that `apiConfig.js` references with a `REACT_APP_` prefix is in the production bundle. The `.env.example` lists the codes as `DTC_API_CODE` (no prefix), intended for `server.js`. This mismatch means either (a) the codes are never set in the client and all API calls 401 — in which case the proxy is silently never used — or (b) the codes *are* being set with the `REACT_APP_` prefix, in which case they are public.

Fix: same as S1-1 — remove every `REACT_APP_*_API_CODE` from the client, delete `API_CODES` and `ENDPOINTS`, and route all requests through `/api/proxy/*` on the Express server.

### S1-3. The Express proxy is imported but never used
`src/constants/apiConfig.js:41` declares `export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000'`, and `src/services/apiService.js:4` imports it — grep confirms those are the only two references in the entire `src/` tree. Every fetch in the client uses `ENDPOINTS.*` which resolve to `https://fadev-im-fileconnect-frontend-uks03.azurewebsites.net/...?code=...`, i.e. direct-to-Azure.

Net effect: `server.js` (Redis caching, auth, rate control, 60-second audit timeout, request logging) contributes nothing to the live app. The Redis connection, the in-memory session store, and the requireAuth middleware are all dead code from the browser's perspective.

Fix is the same change as S1-1 and S1-2. Once the proxy is wired, all three issues close together.

---

## S2 — Fix before next prod push

### S2-1. `parseHHMMSS` returns the wrong unit
`src/utils/performanceUtils.js:27–30`
```js
export const parseHHMMSS = (timeStr) => {
  const ms = parseToMs(timeStr);
  return ms === null ? null : ms * 1000;   // BUG: should be ms / 1000
};
```
The JSDoc on line 24 says "total seconds (float)"; the function returns **ms × 1000**, i.e. microseconds. `grep` shows the export is not currently called from anywhere else in the codebase, so nothing visible is broken today, but the bug will bite the first caller that imports it. Either fix the body to `ms / 1000` or delete the export. The correct sibling function already exists as `timeToSeconds` at line 106.

### S2-2. Console logging leaks user data in production
31 `console.log` / `console.error` calls across `src/services/apiService.js`, `src/services/fetchUtils.js`, `src/utils/exportUtils.js`, `src/utils/storageUtils.js`, `src/pages/DtcAuditFilter.jsx`, `src/pages/DtcFailedFiles.jsx`, `src/components/DataTable.jsx`, `src/components/ErrorBoundary.jsx`. Some of these log full API payloads and filter state (e.g. `apiService.js:70` logs the email-export payload, which can contain PII). Production builds should not emit these.

Fix: introduce a thin `logger` wrapper that no-ops when `process.env.NODE_ENV === 'production'`, or strip `console.*` via CRA's built-in Babel plugin (`babel-plugin-transform-remove-console` in a `craco` config). Keep `console.error` for `ErrorBoundary` and the proxy server only.

### S2-3. Unbounded Non-DTC background pagination
`src/context/AppContext.js:199–206`
```js
let nonDtcToken = nonDtcFirst?.continuationToken || null;
while (nonDtcToken && !controller.signal.aborted) {
  const page = await api.fetchNonDtcAuditData(nonDtcToken, NON_DTC_PAGE_SIZE, { signal: controller.signal });
  if (controller.signal.aborted) break;
  const newRows = Array.isArray(page?.data) ? page.data : [];
  nonDtcRecords.push(...newRows);
  nonDtcToken = page?.continuationToken || null;
  if (newRows.length > 0) commitNonDtcData([...nonDtcRecords]);
}
```
There is no page cap and no guard against the backend returning the same continuation token twice. If Azure ever streams back a malformed or steady-state token, the loop runs forever, writes to `localStorage` on every iteration (`commitNonDtcData` → `writeCache`), and will eventually blow through the 5–10 MB quota. `setState` on every page also re-renders every subscriber of `AppContext`.

Fix: add `const MAX_PAGES = 200;` and track a seen-token Set; break if the current token has been seen before. Batch `commitNonDtcData` to run at most once per 500 ms or once per 5 pages.

### S2-4. `React.StrictMode` × `!mountedRef.current` double-fetch guard is race-prone
`src/context/AppContext.js:269–283` gates the initial fetch on `if (mountedRef.current) return undefined; mountedRef.current = true;`. Under StrictMode (which `src/index.js:8` enables), the effect runs → cleanup → effect-again. The second run is skipped by the guard, so the cleanup on line 281 aborts the only fetch's AbortController. Net effect: the first in-flight request is cancelled, and nothing ever restarts it — the user sees the cached localStorage data until auto-refresh fires 60 seconds later.

Fix: drop the `mountedRef` flag and rely on the `isFetchingRef` lock already present at line 148, or move the "already-mounted" test inside `fetchAllData` so that the cleanup path does not abort the controller that is still needed.

### S2-5. Client-side auth state survives after token revocation
`src/pages/Login.jsx:25–26` calls `onLogin(user)` which stores the user blob in `sessionStorage`. `src/context/AppContext.js:86–91` rehydrates it on every page load. There is no round-trip to the server — any tampering with `sessionStorage.user = { role: 'Admin' }` grants admin privileges until the user logs out. Role-based UI (e.g. `canEditInfo` in `Home.jsx:49`) is purely cosmetic.

Fix: after S1 is done, the session token is server-signed. Client-side role checks stay as UI hints only; all privileged mutations must re-validate the token server-side.

### S2-6. `downloadFile` / `viewFile` leak the Azure code in the URL
`src/services/apiService.js:94–112`
```js
const url = `${apiEndpoint}?path=${encodeURIComponent(cleanPath)}${code ? `&code=${encodeURIComponent(code)}` : ''}`;
```
Same issue as S1-2: the function code appears as a query parameter, so it ends up in browser history, referrer headers, any intermediate proxy logs, and any browser extension with `webRequest` permission. Fix is part of the broader "route everything through the proxy" change — `server.js:238` and `server.js:257` already have `/api/proxy/downloadFile` and `/api/proxy/viewFile` that stream the blob back.

### S2-7. `fetchFileResponse` has no timeout
`src/services/apiService.js:101` is a bare `fetch(url, { method: 'GET' })`. If the Azure blob API hangs, the `<FileViewModal>` spinner spins forever — no abort, no timeout, no user-visible error. Contrast with `fetchAuditPage` which uses `withTimeoutSignal`.

Fix: reuse `withTimeoutSignal(options.signal, 30_000)` from `src/services/fetchUtils.js:8`.

### S2-8. `useEffect` deps break cache-aware filter restoration
`src/hooks/useAuditFilters.js:24–37`
```js
useEffect(() => {
  ...
  if (dataDeps.every(d => Array.isArray(d) ? d.length > 0 : !!d)) {
    setFilteredResults(applyFn(saved));
    ...
  }
}, dataDeps);          // deps is the raw array from the caller
```
Two subtle issues:
1. Lint rule is suppressed (`// eslint-disable-next-line react-hooks/exhaustive-deps`) — fair, the caller controls the deps — but the default parameter `dataDeps = []` on line 13 creates a **new array every call**, so a caller that omits the argument gets a fresh reference and the effect runs every render.
2. `applyFn(saved)` uses the *caller's* applyFn captured at the moment the effect runs, not `applyFnRef.current`. Because `apply` is reassigned to the ref on every render, this is usually fine, but the code explicitly comments (line 19) that it keeps the ref to avoid stale closures — using the ref here too would be more consistent.

Fix: memoise the deps array at the call site with `useMemo`, and use `applyFnRef.current(saved)` for consistency.

### S2-9. `Home.jsx` timestamp effect fires on every Non-DTC background page
`src/pages/Home.jsx:41–45`
```js
React.useEffect(() => {
  if (auditData.length > 0) {
    setDashboardUpdatedAt(new Date().toLocaleTimeString());
  }
}, [auditData, nonDtcAuditData]);
```
AppContext's background loop for Non-DTC commits a new array reference on every page (see S2-3). Each commit flips the `nonDtcAuditData` reference, which retriggers this effect, which calls `setDashboardUpdatedAt`, which re-renders every component downstream of Home. For a 2,000-row Non-DTC dataset this can be 10–20 redundant renders on first load.

Fix: update the timestamp only on `dataComplete` (already exposed by AppContext) or throttle via `useRef` + setInterval.

---

## S3 — Next sprint

### S3-1. `DataTable.jsx` is 1,219 lines
A table component with global search, per-column filter popovers, column resizing, drag-to-reorder, row selection, email export, file preview, and pagination — all in one file, with most styles inline. Beyond the maintenance cost, the whole component re-renders on any state change because it cannot be `React.memo`-ised.

Fix: split into `DataTable`, `DataTableHeader`, `DataTableRow` (memoised), `DataTableToolbar`, `ColumnFilterPopover` (already nested — extract), `Pagination`. Move inline styles to a `DataTable.module.css`.

### S3-2. Unused/dead files
- `src/components/DtcFilterDropdown_old.jsx` — not imported anywhere.
- `src/data/ADMS_DEV_V1.js`, `MPRS_DEV_V1.js`, `Electralink_DEV_V1.js`, `Audit_Data_Dummy.js`, `mockData.js`, `application subscription.js` — none of them are imported from any source file (grep confirms). The only matches are a placeholder string `"e.g., ADMS_DEV_V1"` in `src/pages/Subscriptions.jsx:653`.

Fix: delete. Filenames with spaces (`application subscription.js`) also break some tooling.

### S3-3. Heavy libraries loaded eagerly
`src/utils/exportUtils.js:1–3`
```js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
```
`jspdf` + `jspdf-autotable` + `xlsx` total ~700 KB minified. Every user pays that cost even if they never export. `exportUtils` is imported by `DataTable`, which is rendered on the first authenticated page.

Fix: dynamic import inside the handlers — `const { default: jsPDF } = await import('jspdf');` and similar for XLSX. Wrap the export button in `React.lazy` + `Suspense` so the bundle splits naturally.

### S3-4. `HashRouter` in `src/App.js:2`
Hash-based routing (`/#/dtc-audit`) predates HTML5 History on Azure Static Web Apps. Given `public/staticwebapp.config.json` already routes `"/*"` with fallback, `BrowserRouter` would give cleaner URLs, better link-sharing, and better analytics. Unless there is an infrastructure reason (intranet proxies, embedded iframes), switch.

### S3-5. `ErrorBoundary` swallows production errors
`src/components/ErrorBoundary.jsx:13–18` logs only when `NODE_ENV === 'development'`. In production nothing is reported — no Sentry, no `window.onerror` wire-up, no `window.addEventListener('unhandledrejection')`. When a user hits a React error, ops learns about it only via phone call.

Fix: integrate Sentry (or any telemetry) in `componentDidCatch`, plus a global `unhandledrejection` listener in `src/index.js`.

### S3-6. `staticwebapp.config.json` says AAD, code says local username/password
`public/staticwebapp.config.json:3–10` configures Azure AD as the identity provider with `"allowedRoles": ["authenticated"]`, but `Login.jsx` is a custom form validating against `REACT_APP_USERS`. Either a user is hitting AAD before ever seeing `Login.jsx` (making the custom form redundant), or the AAD config is aspirational and not deployed. Pick one.

### S3-7. Inline `onMouseEnter`/`onMouseLeave` mutate DOM directly
`src/components/DataTable.jsx:180–181`
```jsx
onMouseEnter={(e) => (e.currentTarget.style.background = '#eef2ff')}
onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
```
Same pattern appears in `DtcFilterDropdown.jsx` and a few other places. It works, but it is imperative DOM mutation inside React, it breaks if the element is re-rendered mid-hover (the style is lost), and it is slower than a `:hover` CSS rule. React's StrictMode double-invoke is already doing more DOM work than needed.

Fix: add `.filter-option:hover { background: #eef2ff; }` to a CSS module.

### S3-8. `String(x || '')` loses falsy-but-valid values
Pattern appears in `DataTable.jsx:94, 416` and in many other components:
```js
row[col.key] || ''         // 0 → "", false → "", "" → ""
String(row[col.key] || '') // same loss
```
For numeric columns (file size, duration, count) the value `0` becomes an empty string and disappears from the filter dropdown.

Fix: use nullish coalescing — `row[col.key] ?? ''`. Across the codebase.

### S3-9. `isDateInRange` and `combineDateTime` treat ISO strings as local time
`src/utils/dateUtils.js:18–28`
```js
if (endDate && item < new Date(`${endDate}T23:59:59`)) return false;
// ...
export const combineDateTime = (date, time, defaultTime = '00:00:00') =>
  date ? `${date}T${time || defaultTime}` : '';
```
`new Date('2026-04-22T23:59:59')` is parsed as local time; Azure's timestamps come back in UTC. A user in the UK sees correct ranges in winter but a one-hour off-by-one during BST. A user on Azure Virtual Desktop pinned to UTC sees correct ranges. A user in IST (UTC+05:30) sees a 5.5-hour skew.

Fix: either append `Z` to force UTC interpretation or use `.setUTCHours(23, 59, 59, 999)`. Document the intended timezone.

### S3-10. `applyDtcFilters` uses substring match where ID equality is intended
`src/utils/dtcFilterUtils.js` — `filters.msgId` (and similar ID fields) match via `.includes()`. If the user types `1` they match `11`, `21`, `123`, `2134`… Either make the semantics clear ("contains" hint next to the input) or switch to exact match for ID fields.

### S3-11. `ClickSpark` wraps the whole authenticated app
`src/App.js:151–157` wraps every page in `ClickSpark`. Every click anywhere adds DOM nodes and requires cleanup. On a page with a 2,000-row `DataTable`, the extra event listener and DOM writes are a measurable hit on interaction latency. Consider scoping it to the landing page only, or making it opt-out via user preference.

### S3-12. `DataTable.jsx:266–268` — missing dependency silenced
```js
useEffect(() => {
  onPageChange?.(currentPage, pageSize);
}, [currentPage, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps
```
If the parent replaces `onPageChange` between renders, the effect will fire against a stale callback. Low probability today, but the hazard is real. Either depend on `onPageChange` or wrap it in a ref.

### S3-13. `fetchAllData` can lose data under restart
`src/context/AppContext.js:179–182`
```js
const userHasLoadedMore = auditDataRef.current.length > dtcRecords.length;
if (!userHasLoadedMore) {
  commitAuditData(dtcRecords);
}
```
If a silent auto-refresh comes back with fewer records than the user has already loaded via "Load More", the refresh is dropped. But the accompanying `setDtcContinuationToken(null)` or `dtcFirst?.continuationToken` on line 184 overwrites the token used by the already-loaded tail. Next "Load More" will either skip pages or duplicate rows (the dedup on line 245 will mask duplicates but not skips).

Fix: when `userHasLoadedMore` is true, also skip updating the continuation token.

### S3-14. `storageUtils.js:4–11` swallows corruption silently
If JSON.parse fails, `read` returns the default. The next write overwrites the corrupt value, which is correct behaviour, but users with quota issues will see silent data loss forever. A single one-shot `console.warn` the first time either read or write fails would surface the problem.

### S3-15. Clickable `<div>` elements without keyboard support
Examples in `DataTable.jsx:167–184` (filter suggestions), `Home.jsx` dashboard cards, and `DtcFilterDropdown.jsx` options. `role="button"` + `tabIndex={0}` + `onKeyDown` (Enter/Space) are missing, blocking keyboard-only users.

### S3-16. Missing `aria-label`s on icon buttons
`DataTable.jsx` toolbar buttons (Download, Filter, Search), `App.js:82–95` dismiss button, header nav — all icon-only with no `aria-label`. Screen readers announce "button" with no context.

### S3-17. Commented-out `console.error` in `ErrorBoundary.jsx` is the only visible auth failure
Since all requests hit Azure directly with query-string codes, any 401 surfaces as a generic "DTC API failed" banner in `App.js:11–99`. There is no distinction between "bad code", "expired code", "Azure down", "CORS blocked". Users see a red bar and retry.

---

## S4 — Polish / nice-to-have

### S4-1. `uniqueValues` in `DataTable.jsx:93–95` recomputes on every `allData` reference change — `allData` is the filtered view, which changes on every keystroke. Memo key should probably be a stable reference to the full dataset or a hash of the column key alone if the column values are stable.

### S4-2. `framer-motion` is 200 KB minified and is used in three places (`Login.jsx`, `App.js`'s `ApiWarningBanner`, and a couple of dashboard sections). If these are not core UX, replacing with CSS transitions saves a meaningful chunk of the bundle.

### S4-3. `src/App.js:46–95` inlines 50+ lines of styles for the warning banner. Move to CSS — same for the dismiss button hover styles.

### S4-4. `DataTable.jsx:261` initialises `columnFilters` to `{}` but never persists it. Filters reset on page refresh; the search term and page number do persist in `sessionStorage`. Inconsistent UX.

### S4-5. `src/pages/Analytics.jsx:47` uses a fixed `gridTemplateColumns: '220px 1fr 1fr'` — unresponsive on narrow screens. Add a CSS `@media (max-width: 768px)` override.

### S4-6. `Home.jsx:50` — `NON_DTC_DELIVERED_STATUSES` is recreated on every render. Move to module scope.

### S4-7. `package.json:16` — `node-fetch@^2.6.11` is a v2-only CommonJS package pinned for `server.js`. Node 18+ has global `fetch`; the dependency is removable.

### S4-8. `package.json:18` — `react@^19.2.4` with `react-scripts@5.0.1`. CRA 5 predates React 19 by several years and does not officially support it. Migration to Vite (`vite-plugin-react`) cuts dev-start time from ~15s to ~1s and gives you native ESM.

### S4-9. `useDebounce` rebuilds the timer on every `delay` change, which is fine, but the hook does not expose a `cancel` / `flush` API. A library like `use-debounce` gives both without extra code.

### S4-10. `App.js:20–34` has two separate `useEffect`s for the banner lifecycle — activeError → visibleError, then visibleError+dismissed → timeout. These can be collapsed into one effect keyed on `activeError`, which also eliminates the intermediate `visibleError` state.

---

## Verification trail

The following claims were re-checked against the source:

- `REACT_APP_USERS` read on client — `src/pages/Login.jsx:16` (read).
- `REACT_APP_*_API_CODE` reads on client — `src/constants/apiConfig.js:9–20` (read).
- `API_BASE` imported but never used — grep for `API_BASE|/api/proxy|/api/auth` returned only the definition (`apiConfig.js:41`) and the import (`apiService.js:4`).
- `parseHHMMSS` wrong unit — `performanceUtils.js:27–30` (read); no external callers (grep).
- Dead files — `DtcFilterDropdown_old.jsx`, `ADMS_DEV_V1.js`, `MPRS_DEV_V1.js`, `Electralink_DEV_V1.js`, `Audit_Data_Dummy.js`, `mockData.js`, `application subscription.js`: grep found zero importers.
- 31 `console.*` calls — grep count across 8 files.
- `DataTable.jsx` length — 1,219 lines (wc).
- `jspdf` / `xlsx` loaded eagerly — `exportUtils.js:1–3` (read).
- `HashRouter` — `App.js:2` (read).
- StrictMode × mountedRef race — `index.js:8` enables StrictMode; `AppContext.js:269–283` implements the guard.

---

## Recommended order of fixes

1. S1-1 / S1-2 / S1-3 together (one change: wire the client through the proxy, remove client-side credentials and codes).
2. S2-1 (one-line fix).
3. S2-2 (strip console in prod).
4. S2-3 (page-cap the background loop).
5. S2-4 and S2-9 (React StrictMode correctness in AppContext and Home).
6. S2-7 (timeout on file download/preview).
7. S3-1 (split DataTable).
8. S3-3 (lazy-load export libs).
9. Everything else.

After the S1/S2 batch ships, the app is meaningfully safer and the user-visible latency drops. S3 and S4 are ongoing hygiene.
