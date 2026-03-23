# CORS Error Fix

## Issue
```
Access to fetch at 'https://fadev-im-fileconnect-frontend-uks03.azurewebsites.net/api/dtcAuditApi' 
from origin 'http://localhost:3000' has been blocked by CORS policy
```

## Root Cause
The Azure Function API does not allow CORS requests from `localhost:3000`. It's configured to only accept requests from the AVD environment.

---

## Solutions

### Option 1: Run in AVD (Recommended for Production)
The application is designed to run in Azure Virtual Desktop (AVD) where CORS is properly configured.

**No code changes needed** - just deploy and run in AVD.

---

### Option 2: Use Proxy Server (For Local Development)

The project already has a proxy server configured. Use it:

```bash
# Terminal 1: Start proxy server
npm run proxy-server

# Terminal 2: Start React app
npm start
```

Or run both together:
```bash
npm run dev
```

Then update `.env` to use proxy:
```
REACT_APP_API_URL=http://localhost:5000
```

---

### Option 3: Ask Backend Team to Add CORS

Contact the backend team to add `http://localhost:3000` to the CORS whitelist in the Azure Function configuration.

**Azure Function CORS Settings:**
- Go to Azure Portal
- Navigate to Function App
- Settings → CORS
- Add: `http://localhost:3000`

---

## Infinite Loop Fix

**Fixed in:** `src/pages/DtcAuditFilter.jsx`

**Issue:** useEffect was causing infinite re-renders

**Solution:** Changed dependency from `auditData` to `auditData.length`

```javascript
// Before (causes infinite loop)
useEffect(() => {
  if (incomingFilters && auditData.length > 0 && !hasQueried) {
    handleQuery();
  }
}, [auditData, incomingFilters, hasQueried]);

// After (fixed)
useEffect(() => {
  if (incomingFilters && auditData.length > 0 && !hasQueried) {
    handleQuery();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [auditData.length, hasQueried]);
```

---

## Quick Test

After applying fixes, verify:

1. **No infinite loop:** Check console - should not see repeated API calls
2. **CORS resolved:** 
   - If in AVD: Should work immediately
   - If localhost: Use proxy server or ask backend team

---

## For Production Deployment

**No changes needed** - the app is configured to work in AVD where CORS is properly set up.

The CORS issue only affects local development on `localhost:3000`.
