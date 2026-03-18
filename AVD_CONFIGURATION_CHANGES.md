# AVD Configuration Changes

## Summary
Configured the application to fetch real data from Azure APIs when running inside AVD (Azure Virtual Desktop) and removed dummy data from Performance Detail page.

## Changes Made

### 1. Environment Configuration (`.env`)
- **Changed**: `REACT_APP_USE_API=false` → `REACT_APP_USE_API=true`
- **Effect**: Application now fetches real data from Azure APIs instead of using mock data

### 2. API Service (`src/utils/api.js`)
- **Added**: `fetchPerformanceData()` method
- **Purpose**: Fetches real audit data and calculates performance metrics per application
- **Logic**:
  - Fetches up to 500 audit records from Azure
  - Groups records by application name
  - Calculates average processing time (timestamp - created)
  - Returns performance metrics with actual data

### 3. Performance Detail Page (`src/pages/PerformanceDetail.jsx`)
- **Removed**: Hardcoded `PERFORMANCE_ITEMS` from `dashboardConfig.js`
- **Added**: Real-time data fetching using `api.fetchPerformanceData()`
- **Features**:
  - Loading state while fetching data
  - Fallback to dummy data if API fails
  - Dynamic sparkline generation based on actual performance times
  - Filter functionality works with real data

## How It Works

### Data Flow in AVD:
1. Application starts with `REACT_APP_USE_API=true`
2. Home page fetches audit data from Azure API
3. Performance section calculates metrics from real audit data
4. Performance Detail page fetches and displays real performance metrics
5. All dummy data is bypassed

### Performance Calculation:
```javascript
// For each application:
- Total Processing Time = Sum of (Event_4_timestamp - Event_1_timestamp)
- Average Time = Total Processing Time / Number of Files
- Files Count = Total files processed by that application
```

## Testing

### To verify real data is being used:
1. Run the application inside AVD
2. Open browser console (F12)
3. Look for logs:
   - `🔄 Fetching DTC Audit from Azure:`
   - `✅ Raw API response:`
4. Navigate to Performance Detail page
5. Verify data matches actual audit records (not dummy data)

### Expected Behavior:
- ✅ Home page shows real file counts
- ✅ Performance section shows calculated metrics from real data
- ✅ Performance Detail page shows real application performance
- ✅ No dummy data visible in Performance Detail

## Rollback (if needed)

To revert to dummy data mode:
```bash
# Edit .env file
REACT_APP_USE_API=false
```

Then restart the application.

## Notes

- Performance data is calculated from the last 500 audit records
- If no audit data is available, the app falls back to dummy data
- Processing time is calculated as the difference between Event Type 1 (received) and Event Type 4 (delivered)
- Applications with no valid timestamp data are excluded from performance metrics
