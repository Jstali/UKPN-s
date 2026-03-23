# Destination Column Click Enhancement

## Overview

Enhanced the **Destination column click behavior** in the DTC Audit Results Table to use unique identifiers for reliable navigation.

---

## ✅ Changes Implemented

### 1. Clickable Destination Column ✅

**Before:**
- Destination column was plain text
- No click interaction

**After:**
- Destination column is clickable (link style)
- Blue color (#4c4ebd)
- Underline on hover
- Cursor pointer
- Opens detail view on click

---

### 2. Unique ID Navigation ✅

**Implementation:**
- Uses `row.id` (primary unique identifier)
- Fallback to `row.eventId` if `id` is not available
- Passes unique ID to detail view via state

**Navigation:**
```javascript
navigate(`/audit-details`, { 
  state: { 
    record: row,           // Full record data
    uniqueId: row.id || row.eventId  // Unique identifier
  } 
});
```

---

### 3. Visual Feedback ✅

**Styling:**
- Color: `#4c4ebd` (UKPN blue)
- Cursor: `pointer`
- Text decoration: `underline` on hover
- Font size: `12px` (consistent with table)

**Hover Effect:**
- Underline appears on hover
- Removes underline on mouse leave
- Smooth visual feedback

---

### 4. Data Structure

**Each row includes:**
```javascript
{
  id: "unique-record-id",           // Primary unique ID
  eventId: "unique-event-id",       // Event/Message ID
  application: "ADMS",              // Destination name (displayed)
  // ... other fields
}
```

**Unique ID Priority:**
1. `row.id` - Primary record ID
2. `row.eventId` - Event/Message ID (fallback)

---

### 5. Backward Compatibility ✅

**Fallback Logic:**
- If `id` is missing → uses `eventId`
- If both missing → still navigates with full record
- Detail view can handle both scenarios

**Existing Behavior:**
- All existing navigation still works
- Full record data passed to detail view
- No breaking changes

---

### 6. Detail View Integration ✅

**AuditDetails.jsx receives:**
```javascript
const record = location.state?.record;      // Full record data
const uniqueId = location.state?.uniqueId;  // Unique identifier
```

**Usage:**
- Display all record details
- Use `uniqueId` for API calls (if needed)
- Fetch additional data using unique ID

---

## Files Modified

### `src/components/DataTable.jsx`

**Added:**
- Click handler for `application` column
- Unique ID extraction (`row.id || row.eventId`)
- Link styling (color, cursor, underline)
- Hover effects
- Session storage for pagination state

**Code:**
```javascript
col.key === 'application' ? (
  <span
    style={{ 
      color: '#4c4ebd', 
      cursor: 'pointer', 
      textDecoration: 'underline', 
      fontSize: '12px' 
    }}
    onClick={() => {
      sessionStorage.setItem('dataTablePage', String(currentPage));
      sessionStorage.setItem('dataTablePageSize', String(pageSize));
      navigate(`/audit-details`, { 
        state: { 
          record: row, 
          uniqueId: row.id || row.eventId 
        } 
      });
    }}
    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
  >
    {row[col.key]}
  </span>
)
```

---

## Benefits

✅ **Unique Identification** - Uses reliable unique ID instead of destination name  
✅ **No Ambiguity** - Eliminates issues when multiple records have same destination  
✅ **Better UX** - Clear visual feedback (clickable link style)  
✅ **Scalable** - Works with any unique identifier from backend  
✅ **Backward Compatible** - Fallback logic ensures no breaking changes  
✅ **Consistent Navigation** - Same pattern as ID column click  

---

## User Experience

### Visual Indicators
1. **Color**: Blue text indicates clickability
2. **Cursor**: Pointer cursor on hover
3. **Underline**: Appears on hover for emphasis
4. **Consistent**: Matches ID column behavior

### Click Behavior
1. User clicks Destination column
2. Pagination state saved (returns to same page)
3. Navigates to detail view
4. Detail view receives full record + unique ID
5. Can fetch additional data using unique ID

---

## Testing Checklist

- [ ] Click Destination column opens detail view
- [ ] Unique ID is passed correctly
- [ ] Detail view displays correct record
- [ ] Hover effect shows underline
- [ ] Cursor changes to pointer on hover
- [ ] Blue color applied to Destination text
- [ ] Works with records that have `id`
- [ ] Works with records that have `eventId` (fallback)
- [ ] Pagination state preserved on navigation
- [ ] Back button returns to correct page
- [ ] No console errors
- [ ] Consistent with ID column behavior

---

## Example Usage

### Scenario 1: Click Destination "ADMS"
1. User sees "ADMS" in Destination column (blue, underlined on hover)
2. User clicks "ADMS"
3. Navigation: `/audit-details` with state:
   ```javascript
   {
     record: { id: "abc123", application: "ADMS", ... },
     uniqueId: "abc123"
   }
   ```
4. Detail view opens showing full audit record

### Scenario 2: Multiple Records with Same Destination
1. Table shows 3 rows with Destination = "ADMS"
2. Each has different unique ID:
   - Row 1: `id: "abc123"`
   - Row 2: `id: "def456"`
   - Row 3: `id: "ghi789"`
3. Clicking each row opens correct detail view
4. No ambiguity or confusion

---

## Future Enhancements (Optional)

- Add tooltip showing "Click to view details"
- Add keyboard navigation (Enter key)
- Add right-click context menu
- Add "Open in new tab" option
- Add loading indicator during navigation

---

**Implementation Date:** March 23, 2026  
**Status:** ✅ Complete  
**Approach:** Unique ID-based navigation with visual feedback
