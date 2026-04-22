# Deployment Scripts

One-shot provisioners for deploying the UKPN Audit app to Azure: React build + the Express proxy (packaged as a **SWA Managed Function**) both ship to the same Static Web App in a single `swa deploy` command.

| Script | Platform | Does |
|---|---|---|
| [`deploy.bat`](deploy.bat)                                 | Windows        | Build React → install api/ deps → `swa deploy` both to the SWA |
| [`deploy.config.bat.example`](deploy.config.bat.example)   | Windows        | Template for per-developer config; copy to `deploy.config.bat` |
| `deploy-proxy.ps1` / `deploy-proxy.sh`                     | Windows / Mac  | **Obsolete.** These deployed `server.js` to a separate App Service — not used by the Managed Function flow. Kept only for teams that want a dedicated linked-backend pattern. |

## Why the Managed Function approach?

The Express proxy (`server.js`) needs to run in Azure somewhere to hide the upstream Azure Function App's function keys from the browser. Two real options:

1. **Separate App Service** linked as SWA backend (old `deploy-proxy.*` flow). Creates more Azure resources, needs Contributor role to create the App Service, costs extra.
2. **SWA Managed Function** (this flow). The Express app runs inside the SWA's own built-in API slot. One deploy, one resource, no extra Contributor asks for resource creation.

The SWA Managed Function path still needs Contributor for **one** thing: setting the 13 app settings the Function reads (`JWT_SECRET`, `USERS`, `API_HOST`, every `*_API_CODE`). That single `az staticwebapp appsettings set` call is a much lighter IT ask than "create an App Service and link it as backend."

## Repo layout

```
UKPN-s/
├── server.js                 # local dev entry point — `node server.js`
├── api/                      # SWA Managed Function — deployed to Azure
│   ├── host.json
│   ├── package.json
│   ├── .funcignore
│   └── proxy/
│       ├── function.json     # route matches every method, any path
│       ├── index.js          # wraps Express app via azure-function-express
│       └── app.js            # all Express routes (the actual proxy logic)
└── src/  …                   # React source
```

Local dev: `node server.js` loads `api/proxy/app.js` and listens on port 4000, same as before.

Azure: SWA serves the React bundle from `build/` and routes `/api/*` requests to the Function at `api/proxy/index.js`, which hands each request to the same Express app.

## Windows one-shot deploy

From the repo root in PowerShell / cmd:

```powershell
:: First time only
copy scripts\deploy.config.bat.example scripts\deploy.config.bat
notepad scripts\deploy.config.bat     :: fill in resource names

:: Every deploy after
scripts\deploy.bat
```

`deploy.bat` does, in order:

1. Load `scripts\deploy.config.bat` (gitignored).
2. Check `node`, `npm`, `az`, `swa` are on PATH and `az` is logged in.
3. `npm install` + `npm run build` → produces `./build/` with relative-URL bundle and `staticwebapp.config.json`.
4. `npm install` inside `./api/` → produces `./api/node_modules/`.
5. `az staticwebapp secrets list` to fetch the deployment token.
6. `swa deploy ./build --api-location ./api --deployment-token <token> --env production` → ships both.

## Prerequisites

- **Node 20+** on your deploying machine.
- **Azure CLI** (`az --version` works) and `az login`.
- **SWA CLI** (`npm install -g @azure/static-web-apps-cli`).
- **Role on SWA:** at minimum whatever lets you run `az staticwebapp secrets list` (Contributor). If your user can't fetch the token, paste it manually into `scripts\deploy.config.bat` — the script falls back to reading `SWA_TOKEN` from the config.

## One-time SWA app settings (needs Contributor — IT task)

After the first `scripts\deploy.bat`, the Function will return 503 with `{"missing": ["JWT_SECRET","USERS","API_HOST"]}` until these are set:

```bash
az staticwebapp appsettings set \
  --name   <swa-name> \
  --resource-group <rg-name> \
  --setting-names \
    JWT_SECRET="<generate 48 random hex>" \
    USERS='<JSON array of {username,password,role}>' \
    API_HOST="https://<your-azure-function-app>.azurewebsites.net" \
    DTC_API_CODE="..." \
    SAP_API_CODE="..." \
    SUBSCRIPTION_CODE="..." \
    FLOWS_API_CODE="..." \
    SOURCE_APP_API_CODE="..." \
    DEST_APP_API_CODE="..." \
    APP_STATUS_API_CODE="..." \
    DROPDOWN_VALUES_API_CODE="..." \
    FILE_STATUS_SUMMARY_CODE="..." \
    AUDIT_EMAIL_EXPORT_CODE="..."
```

Values come from your local `.env` (the Function reads the same variable names).

Optional: `AAD_CLIENT_ID` and `AAD_CLIENT_SECRET` if you want the "Sign in with Microsoft" button to work. `FRONTEND_ORIGIN` is ignored on SWA because all traffic is same-origin.

## Troubleshooting

```bash
# What's live on the SWA?
az staticwebapp show --name <swa> --resource-group <rg> --query "{host:defaultHostname, provider:provider, allowConfig:allowConfigFileUpdates}" -o table

# Managed Function logs — needs Contributor
az monitor app-insights events show --app <swa-app-insights-name> --type requests --output table

# Health probe
curl "https://<swa-host>/api/health"
# Should return: {"status":"ok","redis":false,"missingCore":[],"missingCodes":[]}
# If missingCore is non-empty, IT still needs to set app settings.
```

## Rolling back

SWA CLI deploys replace the current environment's content atomically. To revert, re-run `swa deploy` with an older `build/` folder + `api/` folder (e.g. `git checkout <previous-commit> && scripts\deploy.bat`). There's no time-machine — whatever you push last is what's live.
