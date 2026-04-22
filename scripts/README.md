# Deployment Scripts

One-shot provisioners for deploying the UKPN Audit app to Azure: React build to a Static Web App, `server.js` to a linked Express backend App Service.

| Script | Platform | Does |
|---|---|---|
| [`deploy.bat`](deploy.bat)                                 | Windows        | **Full deploy:** React build → SWA upload → proxy App Service → backend link |
| [`deploy-proxy.ps1`](deploy-proxy.ps1)                     | Windows / AVD  | Backend only (proxy App Service + link) |
| [`deploy-proxy.sh`](deploy-proxy.sh)                       | macOS / Linux  | Backend only, bash equivalent of the PS1 |
| [`deploy.config.bat.example`](deploy.config.bat.example)   | Windows        | Template for per-developer config; copy to `deploy.config.bat` |

## One-shot Windows deploy (recommended for day-to-day)

```powershell
# First time only
copy scripts\deploy.config.bat.example scripts\deploy.config.bat
notepad scripts\deploy.config.bat     # fill in RESOURCE_GROUP, SWA_NAME, etc.

# Every deploy after
scripts\deploy.bat
```

`deploy.bat` does — in order:

1. Loads Azure resource names from `scripts\deploy.config.bat` (gitignored).
2. Checks `node`, `npm`, `az`, `swa` are on PATH and `az` is logged in.
3. `npm install` and `npm run build` — the production bundle uses **relative** API URLs (`/api/…`), not `localhost:4000`, so SWA routes them to the linked backend automatically.
4. Reads the SWA deployment token via `az staticwebapp secrets list` and uploads `build/` via `swa deploy`.
5. Invokes [`deploy-proxy.ps1`](deploy-proxy.ps1) to create/update the App Service running `server.js` and link it as the SWA's "bring your own backend".
6. Prints the final URLs and a smoke-test hint.

Re-running is safe — every step is idempotent.

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
