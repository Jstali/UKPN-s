# Deployment Guide - Azure Static Web Apps

## Problem Summary

**Issue**: Login worked locally but failed after Azure deployment with `405 Method Not Allowed`

**Root Cause**: 
- React environment variables are embedded at **build time**, not runtime
- `.env.production` had `REACT_APP_API_URL=` (empty), causing same-origin `/api/auth/login` calls
- Azure Static Web Apps doesn't have backend routing configured, so `/api/*` returns 405

**Solution**: Point `REACT_APP_API_URL` to actual backend URL during build

---

## Environment Setup

### Local Development
```bash
npm start
# Uses .env.development → http://localhost:4000
```

### QA Deployment
```bash
npm install
npm run build:qa
# Uses .env.qa → https://fadev-im-fileconnect-frontend-uks03.azurewebsites.net
```

### Production Deployment
```bash
npm install
npm run build:prod
# Uses .env.production → https://fadev-im-fileconnect-frontend-uks03.azurewebsites.net
```

---

## Deployment Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Build for Target Environment
```bash
# For QA
npm run build:qa

# For Production
npm run build:prod
```

### 3. Deploy to Azure Static Web Apps

#### Option A: Azure CLI
```bash
az staticwebapp upload \
  --name <your-static-app-name> \
  --resource-group <your-resource-group> \
  --source ./build
```

#### Option B: GitHub Actions (Recommended)
Create `.github/workflows/azure-static-web-apps.yml`:

```yaml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches:
      - main
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches:
      - main

jobs:
  build_and_deploy_job:
    runs-on: ubuntu-latest
    name: Build and Deploy Job
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: true

      - name: Build And Deploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/"
          api_location: ""
          output_location: "build"
          app_build_command: "npm run build:prod"
```

---

## How It Works

### Before (Broken)
```javascript
// .env.production
REACT_APP_API_URL=

// apiConfig.js compiles to:
const API_BASE = ''; // Same-origin

// Login calls:
fetch('/api/auth/login') // ❌ 405 - SWA has no backend
```

### After (Fixed)
```javascript
// .env.production
REACT_APP_API_URL=https://fadev-im-fileconnect-frontend-uks03.azurewebsites.net

// apiConfig.js compiles to:
const API_BASE = 'https://fadev-im-fileconnect-frontend-uks03.azurewebsites.net';

// Login calls:
fetch('https://fadev-im-fileconnect-frontend-uks03.azurewebsites.net/api/auth/login') // ✅ Works
```

---

## Environment Variables Explained

### React Environment Variables (Build-time)
- **MUST** start with `REACT_APP_`
- Embedded into JS bundle during `npm run build`
- Cannot be changed after build without rebuilding
- Visible in browser (never put secrets here)

### Current Setup
```
.env.development  → Local dev (localhost:4000)
.env.qa          → QA environment (Azure backend)
.env.production  → Production (Azure backend)
```

---

## Verification

### 1. Check Build Output
```bash
npm run build:qa
grep -r "REACT_APP_API_URL" build/static/js/*.js
# Should show: https://fadev-im-fileconnect-frontend-uks03.azurewebsites.net
```

### 2. Test Locally
```bash
# Serve production build locally
npx serve -s build -p 3000

# Open browser → http://localhost:3000
# Try login → Should call Azure backend
```

### 3. Test on Azure
```bash
# After deployment
# Open: https://<your-static-app>.azurestaticapps.net
# Network tab should show:
# POST https://fadev-im-fileconnect-frontend-uks03.azurewebsites.net/api/auth/login
```

---

## CORS Configuration

Your backend must allow requests from Azure Static Web Apps:

```javascript
// server.js or backend
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://<your-static-app>.azurestaticapps.net'
  ],
  credentials: true
}));
```

---

## Troubleshooting

### Issue: Still getting 405
**Check**: Did you rebuild after changing `.env.production`?
```bash
npm run build:prod
```

### Issue: CORS errors
**Check**: Backend CORS allows your Static Web App domain
```bash
# Check response headers
curl -I https://fadev-im-fileconnect-frontend-uks03.azurewebsites.net/api/auth/login
```

### Issue: Environment variable not updating
**Check**: Clear build cache
```bash
rm -rf build node_modules/.cache
npm run build:prod
```

---

## Best Practices

1. **Never commit secrets** to `.env` files
2. **Use CI/CD environment variables** for sensitive values
3. **Test production builds locally** before deploying
4. **Keep backend URL in environment files** for easy updates
5. **Document all environment variables** in `.env.example`

---

## Alternative: Runtime Configuration

If you need runtime configuration (change API URL without rebuild):

### Option 1: window.env.js
```html
<!-- public/index.html -->
<script src="%PUBLIC_URL%/env.js"></script>
```

```javascript
// public/env.js (not tracked in git)
window.ENV = {
  API_URL: 'https://fadev-im-fileconnect-frontend-uks03.azurewebsites.net'
};

// src/constants/apiConfig.js
const API_BASE = window.ENV?.API_URL || process.env.REACT_APP_API_URL || 'http://localhost:4000';
```

### Option 2: Azure App Settings
Use Azure Static Web Apps configuration to inject values at runtime (requires custom setup).

---

## Summary

✅ **Fixed**: API calls now use correct backend URL  
✅ **Scalable**: Separate env files for dev/qa/prod  
✅ **Clean**: No hardcoded URLs in code  
✅ **Documented**: Clear deployment process  

**Key Takeaway**: React env vars are build-time constants. Always rebuild when changing them.
