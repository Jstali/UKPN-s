# View & Download Button Issue - Resolution

## Issue
View and Download buttons in DTC Audit table are not working.

## Root Cause
The audit data from the API does not include the actual file content. The buttons are looking for:
- `row.fileContent` or `row.File_Content`

But the API only returns metadata like:
- `Source_FileName`
- `File_ID`
- `Destination_Path`
- Event information

**The actual file content is NOT included in the API response.**

---

## Current Behavior (Fixed)

When users click View or Download buttons:
- Shows alert: "File content is not available in the current data. This feature requires file content to be included in the API response."
- Prevents error and provides clear feedback

---

## Solutions

### Option 1: Backend API Enhancement (Recommended)
Ask the backend team to add file content to the API response:

```json
{
  "id": "abc123",
  "Source_FileName": "example.txt",
  "File_ID": "12345",
  "File_Content": "actual file content here...",  // ADD THIS
  // ... other fields
}
```

**OR** add a separate endpoint to fetch file content by ID:
```
GET /api/getFileContent?fileId=12345
```

---

### Option 2: Remove Buttons (Temporary)
If file content won't be available, remove the View/Download buttons:

In `src/pages/DtcAudit.jsx`:
```javascript
<DataTable
  data={...}
  columns={...}
  onDownload={false}  // Change to false
  ...
/>
```

---

### Option 3: Use File Path (If Accessible)
If files are stored in a shared location accessible from AVD:

```javascript
const handleViewFile = (row) => {
  const filePath = row.Destination_Path || row.Source_Path;
  // Open file from network path
  window.open(`file:///${filePath}`, '_blank');
};
```

**Note:** This only works if:
- Files are on a network share
- AVD has access to that location
- Browser allows file:// protocol

---

## Recommended Action

**Contact backend team** to either:
1. Include `File_Content` field in the audit API response
2. Create a new endpoint: `/api/getFileContent?fileId={id}`
3. Provide file download URL: `/api/downloadFile?fileId={id}`

Once backend provides file content or download endpoint, the View/Download buttons will work automatically.

---

## Current Status

✅ **Fixed:** Buttons now show clear error message instead of failing silently  
⚠️ **Pending:** Backend API needs to provide file content or download endpoint

---

## Testing After Backend Fix

Once backend adds file content:

1. Verify API response includes `File_Content` field
2. Click View button → Modal should show file content
3. Click Download button → File should download
4. No error messages should appear

---

**Date:** March 23, 2026  
**Status:** Frontend ready, waiting for backend API enhancement
