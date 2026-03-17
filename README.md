# UKPN Audit & Subscription Portal

A modern, professional, enterprise-grade frontend application for UKPN project management with three main modules: DTC Audit, SAP Audit, and Subscriptions.

## Features

### 🏠 Home Page
- Modern dashboard with three interactive cards
- Smooth animations using Framer Motion
- Gradient backgrounds and hover effects
- Professional UKPN branding

### 📊 DTC Audit & SAP Audit Pages
- Summary cards with animated counters
- Advanced data table with:
  - Search functionality
  - Sorting by columns
  - Pagination controls
  - Page size selector (10/25/50/100)
  - Status badges (Success/Failed/In Progress)
- Breadcrumb navigation
- Smooth page transitions

### 📩 Subscriptions Page
- Dynamic form for creating subscription rules
- Add/remove rules dynamically
- Multiple header string values per rule
- JSON preview modal
- Form validation
- Animated expand/collapse sections

## Tech Stack

- **React.js** - Latest version
- **React Router** - Client-side routing
- **Framer Motion** - Smooth animations
- **Lucide React** - Modern icon library
- **CSS3** - Custom styling with gradients and transitions

## Installation

```bash
cd ukpn-audit-app
npm install
```

## Running the Application

```bash
npm start
```

The application will open at [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── components/
│   ├── Header.jsx              # Top navigation header
│   ├── AnimatedCounter.jsx     # Animated number counter
│   └── DataTable.jsx           # Reusable data table with search/sort/pagination
├── pages/
│   ├── Home.jsx                # Landing page with module cards
│   ├── DtcAudit.jsx           # DTC audit records page
│   ├── SapAudit.jsx           # SAP audit records page
│   └── Subscriptions.jsx      # Subscription management page
├── data/
│   └── mockData.js            # Mock data for audits
├── App.js                     # Main app component with routing
├── index.js                   # Entry point
└── index.css                  # Global styles
```

## Features Breakdown

### Home Page
- Three main navigation cards (DTC Audit, SAP Audit, Subscriptions)
- Staggered animation on load
- Scale and glow effects on hover
- Click animations

### Audit Pages (DTC & SAP)
- **Summary Section**: Displays total files and unique flows with animated counters
- **Data Table**: 
  - Real-time search across all columns
  - Click column headers to sort
  - Pagination with page info
  - Adjustable page size
  - Color-coded status badges

### Subscriptions Page
- **Top-level fields**: Filter ID, Application, ID
- **Dynamic Rules**: Add/remove rules as needed
- **Header Strings**: Multiple values per rule with add/remove functionality
- **File Name Template**: Customizable with {uuid} placeholder
- **Destination Path**: Full path specification
- **Actions**:
  - Submit (logs JSON to console)
  - Reset (clears form)
  - Preview JSON (modal view)

## JSON Output Format

The subscription form generates JSON in this structure:

```json
{
  "filterId": "ADMS",
  "rules": [
    {
      "Header_String": {
        "value": ["ZHV|D0132001|X|+|R|EELC|+|OPER"],
        "fileName": "{uuid}"
      },
      "destination": "//UKPNFORvFS01/WorkHub/Disconnections/D0132Flows"
    }
  ],
  "Application": "ADMS",
  "id": "ADMS"
}
```

## Customization

### Adding More Data
Edit `src/data/mockData.js` to add more audit records.

### Changing Colors
Modify the CSS variables and gradient colors in `src/index.css`.

### API Integration
The components are structured to easily integrate with REST APIs. Replace mock data imports with API calls using fetch or axios.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Future Enhancements

- Dark mode support
- Export data to CSV/Excel
- Real-time data updates
- User authentication
- Advanced filtering options
- Data visualization charts
- Notification system

## License

Proprietary - UK Power Networks

---

Built with ❤️ for UKPN
