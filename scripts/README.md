# Deployment Scripts

One-shot provisioners for deploying the Express proxy (`server.js`) as an Azure App Service and linking it to the existing Azure Static Web App so `/api/*` calls from the browser reach it.

| Script | Platform |
|---|---|
| [`deploy-proxy.ps1`](deploy-proxy.ps1) | Windows / Azure Virtual Desktop (PowerShell 5.1+) |
| [`deploy-proxy.sh`](deploy-proxy.sh)  | macOS / Linux (bash 4+) |

Both scripts do the same thing, step by step:

1. Confirm `az` is authenticated and the target SWA exists.
2. Create the App Service Plan (Linux, B1) if missing.
3. Create the Web App (Node 20 LTS) if missing.
4. Set the startup command to `node server.js`.
5. Read `.env` from the repo root, push every relevant key into App Service app settings, and mint a fresh `JWT_SECRET`.
6. Package `server.js`, `package.json`, `package-lock.json` into `proxy-deploy.zip` and deploy it.
7. Smoke-test `/health`.
8. Link the Web App as the SWA's backend via `az staticwebapp backends link`.

## Prerequisites

- **Azure CLI** on PATH. Check with `az --version`.
- **Logged in** to the right subscription:
  ```bash
  az login
  az account set --subscription "<your-subscription-name-or-id>"
  ```
- **`.env`** in the repo root, with real values (same file the proxy reads locally). At minimum the scripts need:
  - `USERS` — JSON array
  - `API_HOST` — Azure Function App base URL
  - Each `*_API_CODE` you plan to use
- **Node 20+** on this machine (for `crypto.randomBytes` in the JWT secret one-liner).
- **`zip`** on `$PATH` (Mac/Linux script only; Windows uses built-in `Compress-Archive`).

## Usage — Windows / AVD

From the repo root in PowerShell:

```powershell
.\scripts\deploy-proxy.ps1 `
  -ResourceGroup ukpn-fileconnect-rg `
  -SwaName       ukpn-fileconnect-swa `
  -ProxyName     ukpn-fileconnect-proxy `
  -PlanName      ukpn-fileconnect-plan `
  -Location      westeurope
```

## Usage — macOS / Linux

From the repo root in bash:

```bash
chmod +x scripts/deploy-proxy.sh

RESOURCE_GROUP=ukpn-fileconnect-rg \
SWA_NAME=ukpn-fileconnect-swa      \
PROXY_NAME=ukpn-fileconnect-proxy  \
PLAN_NAME=ukpn-fileconnect-plan    \
LOCATION=westeurope                \
./scripts/deploy-proxy.sh
```

## What happens on re-run

Both scripts are idempotent for create-style steps: `az appservice plan create` / `az webapp create` succeed-or-already-exist. The rest (startup command, app settings, deploy, backend link) just reapply. Safe to re-run whenever:

- You've edited `.env` and want the App Service to pick up new values
- You've changed `server.js` and want to push a fresh zip
- The backend link got severed somehow

## Known gotchas

- **`USERS` with single quotes on Windows** — the PowerShell script reads it verbatim from `.env`, so the JSON arrives at Azure intact. Don't edit .env through PowerShell's `$env:USERS = …` variable expansion, which mangles the braces.
- **Fresh JWT_SECRET every run** — the script regenerates it on purpose so a redeploy after a credential leak rotates the secret. Side effect: all existing JWTs instantly become invalid. Users have to log in again after every deploy.
- **Backend link** propagates through SWA's edge within ~1–2 minutes. If `/api/*` still 404s right after deploy, wait a bit before declaring it broken.
- **`AAD_CLIENT_ID` / `AAD_CLIENT_SECRET`** are SWA app settings, not proxy app settings — set them on the SWA, not the App Service:
  ```bash
  az staticwebapp appsettings set \
    --name $SWA_NAME --resource-group $RG \
    --setting-names AAD_CLIENT_ID=<guid> AAD_CLIENT_SECRET=<secret>
  ```

## Troubleshooting

```bash
# Is the proxy running?
az webapp show --name $PROXY_NAME --resource-group $RG --query "state"

# Live log tail
az webapp log tail --name $PROXY_NAME --resource-group $RG

# What app settings actually got set?
az webapp config appsettings list --name $PROXY_NAME --resource-group $RG --output table

# Is the SWA link active?
az staticwebapp backends show --name $SWA_NAME --resource-group $RG
```
