# Quick Reference - Environment Variables

## Current Setup

### Development (Local)
```bash
npm start
# Uses: http://localhost:4000
```

### QA Deployment
```bash
npm run build:qa
# Uses: https://fadev-im-fileconnect-frontend-uks03.azurewebsites.net
```

### Production Deployment
```bash
npm run build:prod
# Uses: https://fadev-im-fileconnect-frontend-uks03.azurewebsites.net
```

---

## Files Created/Updated

✅ `.env.development` - Local development config  
✅ `.env.qa` - QA environment config  
✅ `.env.production` - Production environment config  
✅ `package.json` - Added build:qa and build:prod scripts  
✅ `DEPLOYMENT.md` - Complete deployment guide  

---

## Deploy to Azure Static Web Apps

### Option 1: Manual Upload
```bash
npm install
npm run build:prod
az staticwebapp upload \\
  --name <your-static-app-name> \\
  --resource-group <your-resource-group> \\
  --source ./build
```

### Option 2: GitHub Actions (Recommended)
Add this to `.github/workflows/azure-static-web-apps.yml`:

```yaml
name: Deploy to Azure Static Web Apps

on:
  push:
    branches: [main]

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm install
        
      - name: Build for production
        run: npm run build:prod
        
      - name: Deploy to Azure Static Web Apps
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/"
          output_location: "build"
```

---

## Verify Deployment

### 1. Check Build Output
```bash
npm run build:prod
grep -r "fadev-im-fileconnect-frontend-uks03" build/static/js/*.js | head -1
# Should show the backend URL
```

### 2. Test Locally
```bash
npx serve -s build -p 3000
# Open http://localhost:3000
# Network tab should show calls to Azure backend
```

### 3. Test on Azure
```
Open: https://<your-static-app>.azurestaticapps.net
Network tab should show:
POST https://fadev-im-fileconnect-frontend-uks03.azurewebsites.net/api/auth/login
```

---

## Troubleshooting

### Issue: Still getting 405 error
**Solution**: Rebuild after changing `.env.production`
```bash
rm -rf build node_modules/.cache
npm run build:prod
```

### Issue: CORS errors
**Solution**: Update backend CORS to allow Static Web App domain
```javascript
// Backend server.js
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://<your-static-app>.azurestaticapps.net'
  ],
  credentials: true
}));
```

### Issue: Environment variable not updating
**Solution**: Clear cache and rebuild
```bash
rm -rf build node_modules/.cache
npm install
npm run build:prod
```

---

## Key Takeaways

✅ React env vars are **build-time constants**  
✅ Always rebuild when changing `.env` files  
✅ Use `npm run build:qa` for QA deployments  
✅ Use `npm run build:prod` for production deployments  
✅ Test production builds locally before deploying  

---

## Need Help?

See `DEPLOYMENT.md` for detailed documentation.
