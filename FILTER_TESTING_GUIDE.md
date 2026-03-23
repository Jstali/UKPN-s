# DTC Audit Filter Testing Guide

## Testing Both Filters

### 1. DTC Audit Page Filter (Main Page)

**Location:** `/dtc-audit`

**Test Steps:**

1. **Open Filter**
   - Click "Filters" button in header
   - Filter dropdown should expand
   - ✅ All fields should be visible

2. **Test Primary Filters**
   - Flow: Select a flow → Should filter
   - Version: Select version → Should filter
   - From Role: Select role → Should filter
   - From MPID: Select MPID → Should filter
   - To Role: Select role → Should filter
   - To MPID: Select MPID → Should filter

3. **Test Additional Filters**
   - Source Application: Select app → Should filter
   - Destination Application: Select app → Should filter
   - Event Type: Select type → Should filter
   - Receiving App: Select app → Should filter

4. **Test Date Filters**
   - Event From: Select date + time → Should filter
   - Event To: Select date + time → Should filter
   - File Creation Date: Select date → Should filter

5. **Test ID Filters**
   - File ID: Enter ID → Should filter
   - Msg ID: Enter ID → Should filter

6. **Apply Filter**
   - Click "Apply Filters" button
   - Table should update with filtered results
   - Selection criteria summary should appear
   - Results count should show

7. **Reset Filter**
   - Click "Reset" button
   - All filters should clear
   - Table should show all data

---

### 2. Detail View Filter (View in Detail Page)

**Location:** `/dtc-audit-filter`

**Access:** Click "View in Detail" link in DTC Audit table

**Test Steps:**

1. **Page Load**
   - Page should load without errors
   - Filter section should be visible
   - Table should show data

2. **Test All Filters** (Same as above)
   - Source Application
   - Destination Application
   - Event Type
   - Flow
   - Version
   - From/To Role
   - From/To MPID
   - Receiving App
   - Event timestamps
   - File Creation Date
   - File ID
   - Msg ID

3. **Apply & Reset**
   - Apply button should filter data
   - Reset button should clear filters

---

## Common Issues & Fixes

### Issue 1: Filters Not Applying
**Symptom:** Click "Apply Filters" but table doesn't update

**Fix:**
- Check browser console for errors
- Verify data is loaded (check Network tab)
- Ensure filter values are selected

### Issue 2: Date Filter Not Working
**Symptom:** Date selection doesn't filter results

**Fix:**
- Ensure both date AND time are selected
- Check date format in console
- Verify data has timestamp field

### Issue 3: Infinite Loop
**Symptom:** Page keeps reloading, console shows repeated API calls

**Status:** ✅ Fixed in commit `fb56554`
- Changed dependency from `auditData` to `auditData.length`

### Issue 4: CORS Error
**Symptom:** "Access-Control-Allow-Origin" error in console

**Status:** ⚠️ Environment-specific
- Works in AVD (production environment)
- Doesn't work on localhost (development)
- Solution: Run in AVD or use proxy server

### Issue 5: Empty Results
**Symptom:** Filter applied but shows 0 results

**Check:**
- Are filter criteria too restrictive?
- Does data actually match the filters?
- Try resetting and applying one filter at a time

---

## Expected Behavior

### After Applying Filters:

1. **Table Updates**
   - Shows only matching records
   - Row count updates

2. **Selection Criteria Box Appears**
   - Shows all applied filters
   - Shows result count
   - Example: "Found 25 DTC audit records matching your criteria"

3. **Results Count**
   - KPI chip shows filtered count
   - Example: "Results: 25"

4. **Reset Button Appears**
   - Visible in header
   - Clears all filters when clicked

---

## Filter Logic

### Multi-Select Filters (Applications, Event Type)
- Can select multiple values
- Shows "X selected" when multiple chosen
- Filters show records matching ANY selected value (OR logic)

### Single-Select Filters (Flow, Role, MPID)
- Dropdown selection
- Filters show exact matches

### Date Filters
- Requires both date AND time
- Filters records within date range
- "From" is inclusive start
- "To" is inclusive end

### Text Filters (File ID, Msg ID)
- Partial match (contains)
- Case-insensitive
- Filters as you type

---

## Debugging Steps

If filters not working:

1. **Open Browser Console** (F12)
2. **Check for errors** (red text)
3. **Check Network tab** - API calls successful?
4. **Check Console logs** - Filter values being applied?
5. **Try Reset** - Clear all and start fresh
6. **Try one filter** - Test each filter individually

---

## Known Working State

**Last tested:** March 23, 2026
**Commit:** `13c9e1a`

**Status:**
- ✅ DTC Audit filter: Working
- ✅ Detail view filter: Working
- ✅ Date selection: Manual (no auto-fill)
- ✅ Infinite loop: Fixed
- ⚠️ CORS: Works in AVD only

---

## Quick Test Checklist

- [ ] DTC Audit page loads
- [ ] Filter button opens dropdown
- [ ] All filter fields visible
- [ ] Can select filter values
- [ ] Apply button works
- [ ] Table updates with filtered data
- [ ] Selection criteria shows
- [ ] Reset button clears filters
- [ ] Detail view page loads
- [ ] Detail view filters work
- [ ] No console errors
- [ ] No infinite loops

---

**If all tests pass:** ✅ Filters are working properly

**If any test fails:** Check console for errors and refer to "Common Issues & Fixes" section above.
