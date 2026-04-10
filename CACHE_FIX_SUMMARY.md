# Cache Fix - Show Old Data While Loading New Data

## Problem

When the application opens or refreshes:
1. Loading spinner shows → screen goes blank
2. User sees empty File Status cards (skeleton loaders)
3. User gets confused why data disappeared
4. Takes time to fetch new data from API

## Solution

**Keep previous/cached data visible while fetching new data in the background**

### Changes Made

#### `src/context/AppContext.js`

**Before:**
```javascript
if (!silent) setLoading(true);
```

**After:**
```javascript
// Only show loading spinner if we don't have cached data
const hasCachedData = auditData.length > 0 || nonDtcAuditData.length > 0;
if (!silent && !hasCachedData) setLoading(true);
```

**Result:**
- ✅ First load (no cache): Shows loading spinner
- ✅ Subsequent loads (has cache): Shows old data, updates when new data arrives
- ✅ No blank screen confusion

### How It Works

1. **Initial Load (No Cache)**
   - `auditData.length === 0` → `loading = true`
   - Shows skeleton loaders
   - Fetches data from API
   - Updates UI when data arrives

2. **Refresh (Has Cache)**
   - `auditData.length > 0` → `loading = false`
   - Shows cached data immediately (e.g., 758, 731, 27, 1)
   - Fetches new data in background
   - Updates counts when new data arrives
   - User sees smooth transition, not blank screen

### File Status Metrics (Already Working)

The File Status section **already combines DTC + Non-DTC data**:

```javascript
const fileStats = {
  totalToBeDelivered: auditData.length + nonDtcAuditData.length,
  totalDelivered: dtcDeliveredFiles.length + nonDtcAuditData.filter(isNonDtcDelivered).length,
  pendingDelivery: (total - delivered),
  duplicateChecksum: duplicateChecksumFiles.length + nonDtcDuplicateChecksumCount
};
```

**Metrics:**
- **Total Files to be Delivered**: DTC count + Non-DTC count
- **Total Files Delivered**: DTC delivered + Non-DTC delivered
- **Total Files Pending**: Total - Delivered
- **Duplicate Checksum**: DTC duplicates + Non-DTC duplicates

### Cache Mechanism (Already Implemented)

The app already uses `localStorage` cache:

```javascript
// On load
const [auditData, setAuditData] = useState(() => readCache(DTC_CACHE_KEY));
const [nonDtcAuditData, setNonDtcAuditData] = useState(() => readCache(NON_DTC_CACHE_KEY));

// On update
const commitAuditData = (records) => {
  setAuditData(records);
  writeCache(DTC_CACHE_KEY, records);
};
```

### User Experience

**Before Fix:**
```
App Opens → 🔄 Loading... → ⬜ Blank Screen → ⏳ Wait 5-10s → ✅ Data Shows
```

**After Fix:**
```
App Opens → ✅ Shows Old Data (758, 731, 27, 1) → 🔄 Fetching in background → ✅ Updates to New Data
```

### Testing Checklist

- [x] First load shows loading spinner
- [x] Refresh shows cached data immediately
- [x] File Status combines DTC + Non-DTC
- [x] Counts update when new data arrives
- [x] No blank screen during refresh
- [x] Build succeeds without errors

## Technical Details

### Loading State Logic

```javascript
// Only show loading if no cached data exists
const hasCachedData = auditData.length > 0 || nonDtcAuditData.length > 0;
if (!silent && !hasCachedData) {
  setLoading(true);
}
```

### FileStatusSection Behavior

```javascript
{loading ? (
  // Show skeleton loaders
  <SkeletonCards />
) : (
  // Show actual data with AnimatedCounter
  <MetricsCards fileStats={fileStats} />
)}
```

When `loading=false` and we have cached data:
- Shows old counts immediately
- AnimatedCounter smoothly transitions to new values when data updates

## Benefits

1. **Better UX**: No confusing blank screens
2. **Perceived Performance**: App feels faster
3. **Data Continuity**: Users always see data
4. **Smooth Updates**: Counts animate to new values
5. **No Code Duplication**: Reuses existing cache mechanism

## No Breaking Changes

- All existing functionality preserved
- Cache mechanism unchanged
- File Status calculations unchanged
- Only loading state logic improved
