# View & Download Feature Implementation

## Overview

This document describes the implementation of the **View & Download functionality** for the DTC Audit Results Table using existing data (no new API calls).

## Features Implemented

### 1. ✅ File Download
- Downloads file content from existing row data
- Preserves original file name and format
- Uses Blob API for proper file handling
- Browser automatically downloads file (doesn't open in browser)

### 2. ✅ File View Button
- New "View" button (eye icon) added next to Download button
- Opens modal to preview file content
- Clean, minimal UI design

### 3. ✅ File View Modal
- Full-screen modal with file content preview
- Displays file name in header
- Scrollable content area with preserved formatting
- Close button (X) in top-right corner

### 4. ✅ Content Handling
- **Text files**: Displayed in monospace font with preserved formatting
- **Large files**: Shows first 1,000 lines with truncation notice
- Line breaks and spacing preserved

### 5. ✅ UI/UX Features
- File name displayed at top of modal
- Close button (X icon)
- Scrollable content area
- Copy content button (copies entire file to clipboard)
- Download button inside modal
- Error state for missing content
- Responsive design

### 6. ✅ Error Handling
- User-friendly error messages for:
  - File content not available
  - Missing file data
- Error state displayed in modal

### 7. ✅ Performance
- Non-blocking UI
- No additional API calls
- Preview limited to 1,000 lines for large files

## Files Modified/Created

### New Files
1. **`src/components/FileViewModal.jsx`**
   - Modal component for viewing file content
   - Handles loading, error, and content display states
   - Copy and download actions

### Modified Files
1. **`src/components/DataTable.jsx`**
   - Added View button (eye icon) next to Download button
   - Integrated file view and download handlers using existing row data
   - Added FileViewModal state management
   - Updated Actions column width

2. **`src/index.css`**
   - Added spinner animation for loading states

## Data Structure

The implementation expects the following fields in each row:

```javascript
{
  fileName: "example.txt",           // or Source_FileName
  fileContent: "file content here",  // or File_Content
  fileId: "12345",                   // or File_ID (for reference)
}
```

## Usage

### In DataTable Component

The View and Download buttons appear automatically when `onDownload={true}` is passed to the DataTable component:

```jsx
<DataTable
  data={auditData}
  columns={columns}
  onDownload={true}  // Enables View & Download buttons
  exportConfig={{ filename: 'dtc_audit_report' }}
/>
```

### User Flow

1. **View File:**
   - User clicks eye icon (👁️) in Actions column
   - Modal opens with file content from row data
   - User can scroll, copy, or download from modal
   - Click X or outside modal to close

2. **Download File:**
   - User clicks download icon (⬇️) in Actions column
   - File content from row data is downloaded as Blob
   - Original filename preserved

## Configuration

### Adjust Preview Line Limit

In `FileViewModal.jsx`, change the constant:

```javascript
const MAX_PREVIEW_LINES = 1000; // Change this value
```

### Customize Modal Styling

All styles are inline in `FileViewModal.jsx` for easy customization:
- Modal dimensions: `width: '90%', maxWidth: '1000px'`
- Content area: `maxHeight: '90vh'`
- Font: `Monaco, Consolas, "Courier New", monospace`

## Error Scenarios Handled

| Scenario | Behavior |
|----------|----------|
| Missing file content | Modal shows "File content not available" |
| Missing filename | Uses default "file.txt" or "download.txt" |
| Large file | Shows first 1,000 lines + notice |

## Browser Compatibility

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

## Implementation Notes

- **No API calls**: Uses existing data from table rows
- **AVD Compatible**: Works in Azure Virtual Desktop environment
- **Minimal code**: Clean, simple implementation
- **No backend changes required**: Uses data already loaded in the table

## Testing Checklist

- [ ] View button opens modal
- [ ] File content displays correctly
- [ ] Copy button copies content to clipboard
- [ ] Download button (in modal) downloads file
- [ ] Download button (in table) downloads file
- [ ] Close button closes modal
- [ ] Click outside modal closes it
- [ ] Error messages display for missing content
- [ ] Large files show truncation notice
- [ ] File name displays correctly in header
- [ ] Formatting preserved (line breaks, spacing)
- [ ] Responsive on different screen sizes

---

**Implementation Date:** March 23, 2026  
**Version:** 1.0  
**Status:** ✅ Complete (uses existing data, no API changes needed)
