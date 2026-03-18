# Breadcrumb Navigation - Clickable Paths

## Overview
All breadcrumb paths across the application are now fully clickable, allowing users to navigate back easily through the hierarchy.

## Implementation

### Global CSS Styling
Located in `src/index.css`:
```css
.breadcrumb a {
  color: var(--ukpn-secondary);
  text-decoration: none;
}

.breadcrumb a:hover {
  color: var(--ukpn-secondary-700);
  text-decoration: underline;
}
```

### Breadcrumb Patterns

#### Performance Flow
```
Home → Performance Detail
Home → Performance → [Application Name]
```

**Example:**
- Click "Home" → Returns to dashboard
- Click "Performance" → Returns to Performance Detail page
- Current: "Electralink" (not clickable, current page)

#### Audit Flow
```
Home → DTC Audit → Details
Home → Non DTC Audit → Detail View
```

#### Subscriptions Flow
```
Home → Subscriptions
Home → Subscriptions → [Application Name]
```

#### Failed Files Flow
```
Home → DTC Failed Files
Home → Non DTC Failed Files
```

#### Analytics Flow
```
Home → Analytics
```

## Pages with Clickable Breadcrumbs

✅ **PerformanceDetail.jsx** - `Home → Performance Detail`
✅ **PerformanceGraphPage.jsx** - `Home → Performance → [App]`
✅ **FailedFiles.jsx** - `Home → [Failed Files Type]`
✅ **AuditDetails.jsx** - `Home → DTC Audit → Details`
✅ **NonDtcAuditDetail.jsx** - `Home → Non DTC Audit → Detail View`
✅ **Subscriptions.jsx** - `Home → Subscriptions → [App]`
✅ **Analytics.jsx** - `Home → Analytics`

## User Experience

### Navigation Behavior
1. **Hover Effect**: Links show underline on hover
2. **Color**: Links use UKPN secondary color (#667eea)
3. **Current Page**: Last item in breadcrumb is not clickable (plain text)
4. **Separator**: Arrow (→) between items

### Example User Journey
```
Dashboard (Home)
  ↓ Click "Performance" card
Performance Detail
  ↓ Click "Electralink" row
Home → Performance → Electralink
  ↓ Click "Performance" in breadcrumb
Performance Detail
  ↓ Click "Home" in breadcrumb
Dashboard (Home)
```

## Benefits

✅ **Easy Navigation** - Click any parent level to go back
✅ **Context Awareness** - Always know where you are
✅ **Reduced Clicks** - No need to use browser back button
✅ **Consistent UX** - Same pattern across all pages
