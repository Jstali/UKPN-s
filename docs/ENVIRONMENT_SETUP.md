# Environment Configuration Guide

## 🔐 Security Notice

**IMPORTANT:** This application uses environment variables to store sensitive configuration including API keys and credentials. **NEVER** commit the `.env` file to version control.

## 📋 Setup Instructions

### 1. Create your `.env` file

```bash
# Copy the example file
cp .env.example .env
```

### 2. Configure your environment variables

Edit the `.env` file and replace all placeholder values with your actual configuration:

```env
# Azure Function App Host
REACT_APP_API_HOST=https://your-azure-function-app-host.azurewebsites.net

# API Codes (get from Azure Portal > Function App > App Keys)
REACT_APP_DTC_API_CODE=your_actual_api_code_here
REACT_APP_SAP_API_CODE=your_actual_api_code_here
REACT_APP_SUBSCRIPTION_CODE=your_actual_api_code_here
REACT_APP_FLOWS_API_CODE=your_actual_api_code_here
REACT_APP_SOURCE_APP_API_CODE=your_actual_api_code_here
REACT_APP_DEST_APP_API_CODE=your_actual_api_code_here
REACT_APP_APP_STATUS_API_CODE=your_actual_api_code_here

# Redis (if using server-side caching)
REDIS_URL=redis://localhost:6379

# User credentials (JSON format)
REACT_APP_USERS=[{"username":"admin","password":"secure_password_here","role":"Admin"}]
```

### 3. Verify `.env` is in `.gitignore`

The `.env` file is already listed in `.gitignore`. Verify it's there:

```bash
cat .gitignore | grep .env
```

## 🔑 Environment Variables Reference

### Application Settings

| Variable | Description | Required |
|----------|-------------|----------|
| `REACT_APP_API_HOST` | Azure Function App base URL | ✅ Yes |
| `REACT_APP_USE_API` | Enable API backend (true/false) | ❌ No (default: false) |
| `REACT_APP_API_URL` | Local API base URL | ❌ No (default: http://localhost:4000) |
| `PROXY_PORT` | Proxy server port | ❌ No (default: 4000) |

### Azure Function API Codes

| Variable | API Endpoint | Required |
|----------|--------------|----------|
| `REACT_APP_DTC_API_CODE` | DTC Audit API | ✅ Yes |
| `REACT_APP_SAP_API_CODE` | Non-DTC (SAP) Audit API | ✅ Yes |
| `REACT_APP_SUBSCRIPTION_CODE` | Subscription API | ✅ Yes |
| `REACT_APP_FLOWS_API_CODE` | Flows API | ✅ Yes |
| `REACT_APP_SOURCE_APP_API_CODE` | Source Applications API | ✅ Yes |
| `REACT_APP_DEST_APP_API_CODE` | Destination Applications API | ✅ Yes |
| `REACT_APP_APP_STATUS_API_CODE` | Application Status API | ✅ Yes |
| `REACT_APP_DTC_DOWNLOAD_API_CODE` | Download API (optional) | ❌ No |
| `REACT_APP_DTC_PREVIEW_API_CODE` | Preview API (optional) | ❌ No |

### Infrastructure

| Variable | Description | Required |
|----------|-------------|----------|
| `REDIS_URL` | Redis connection URL for caching | ❌ No (default: redis://localhost:6379) |

### Authentication

| Variable | Description | Required |
|----------|-------------|----------|
| `REACT_APP_USERS` | JSON array of user objects | ❌ No (has defaults) |

**Format for REACT_APP_USERS:**
```json
[
  {"username": "admin", "password": "secure_password", "role": "Admin"},
  {"username": "user1", "password": "user1_password", "role": "Business"}
]
```

## 🚀 Development Workflow

### Local Development

1. Copy `.env.example` to `.env`
2. Fill in your local development values
3. Start the development server:
   ```bash
   npm start
   ```

### Production Deployment

When deploying to production:

1. **Set environment variables in your hosting platform:**
   - **Azure App Service:** Application Settings > Environment variables
   - **Vercel:** Settings > Environment Variables
   - **Netlify:** Site Settings > Environment Variables
   - **Docker:** Use `.env` file or `docker-compose.yml` environment section

2. **NEVER commit `.env` to git**

3. **Rotate API keys regularly** and update environment variables accordingly

## 🔒 Security Best Practices

1. ✅ Use strong, unique passwords for each user account
2. ✅ Rotate API keys periodically (every 90 days recommended)
3. ✅ Use different API keys for development/staging/production
4. ✅ Enable Azure Function key rotation policies
5. ✅ Use Azure Key Vault for production secrets management
6. ✅ Never share `.env` files via email or messaging apps
7. ✅ Use `.env.example` as a template with placeholder values

## 📝 Files Modified

- ✅ `src/utils/api.js` - All API codes now use `process.env.REACT_APP_*`
- ✅ `server.js` - API codes use environment variables
- ✅ `src/pages/Login.jsx` - User credentials from environment
- ✅ `.env.example` - Template file (safe to commit)
- ✅ `.env` - Actual values (NEVER commit)
- ✅ `.gitignore` - Already excludes `.env` files

## 🆘 Troubleshooting

### "API code is undefined" errors

Make sure your `.env` file is loaded:
```bash
# Check if .env exists
ls -la .env

# Verify the variable is set
cat .env | grep REACT_APP_DTC_API_CODE
```

### Application not starting

Check that all required environment variables are set:
```bash
# Required variables checklist
grep -E "^REACT_APP_" .env | wc -l
```

### Build fails with environment variable errors

React requires environment variables to be prefixed with `REACT_APP_`. Verify your variables follow this convention.

## 📚 Additional Resources

- [Create React App: Adding Custom Environment Variables](https://create-react-app.dev/docs/adding-custom-environment-variables/)
- [Azure Function App Keys Management](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook-trigger#authorization-keys)
- [Redis Configuration](https://redis.io/docs/manual/config/)
