@echo off
:: ═══════════════════════════════════════════════════════════════════════════
:: One-shot deploy: builds React, publishes to SWA, deploys server.js to an
:: App Service, and links them as SWA backend.
::
:: Usage (from repo root):
::     scripts\deploy.bat
::
:: Pre-reqs on this machine:
::   - Node 20+, npm
::   - Azure CLI  (`az --version` works), logged in (`az login`)
::   - SWA CLI    (`npm install -g @azure/static-web-apps-cli`)
::   - PowerShell (ships with Windows)
::
:: This script ships:
::   - React build (from ./build)
::   - The Express proxy as a SWA Managed Function (from ./api)
:: …via a single `swa deploy` command. No separate App Service, no backend
:: linking. IT still needs to set 13 app settings on the SWA for the
:: Function to authenticate users and proxy to the Azure Function backend.
::
:: First-time setup:
::   1. Copy scripts\deploy.config.bat.example  →  scripts\deploy.config.bat
::   2. Edit deploy.config.bat with your actual Azure resource names
::   3. Ensure .env at the repo root has real USERS, API_HOST, and *_API_CODE
::      values (the proxy-deploy step reads them via deploy-proxy.ps1).
:: ═══════════════════════════════════════════════════════════════════════════

setlocal ENABLEDELAYEDEXPANSION
cd /d "%~dp0.."

:: Load resource names from the sibling config file
set "CONFIG=%~dp0deploy.config.bat"
if not exist "%CONFIG%" (
  echo.
  echo [ERROR] scripts\deploy.config.bat not found.
  echo         Copy scripts\deploy.config.bat.example to scripts\deploy.config.bat
  echo         and fill in your Azure resource names.
  exit /b 1
)
call "%CONFIG%"

:: Validate required vars are set
for %%V in (RESOURCE_GROUP SWA_NAME PROXY_NAME PLAN_NAME LOCATION) do (
  if "!%%V!"=="" (
    echo [ERROR] %%V is empty. Fix scripts\deploy.config.bat and try again.
    exit /b 1
  )
)

:: ── Pre-flight checks ─────────────────────────────────────────────────────
echo.
echo === Pre-flight ===
where node >nul 2>&1 || (echo [ERROR] node not found on PATH. & exit /b 1)
where npm  >nul 2>&1 || (echo [ERROR] npm not found on PATH.  & exit /b 1)
where az   >nul 2>&1 || (echo [ERROR] az not found on PATH. Install Azure CLI. & exit /b 1)
where swa  >nul 2>&1 || (echo [ERROR] swa not found. Run:  npm install -g @azure/static-web-apps-cli & exit /b 1)

az account show --query "name" -o tsv >nul 2>&1
if errorlevel 1 (
  echo [ERROR] az not authenticated. Run:  az login
  exit /b 1
)
echo Azure CLI: logged in.

:: ── Install + build ───────────────────────────────────────────────────────
echo.
echo === npm install ===
call npm install --no-audit --no-fund || exit /b 1

echo.
echo === npm run build (NODE_ENV=production) ===
call npm run build || exit /b 1

:: Sanity-check that the bundle did NOT bake localhost:4000
findstr /s /m /c:"localhost:4000" build\static\js\*.js >nul
if not errorlevel 1 (
  echo.
  echo [WARN] Production bundle contains 'localhost:4000'. If this is unexpected,
  echo        make sure REACT_APP_API_URL is empty or unset at build time.
)

:: ── Deploy React to SWA ───────────────────────────────────────────────────
echo.
echo === Fetching SWA deployment token ===
for /f "usebackq delims=" %%T in (`az staticwebapp secrets list --name %SWA_NAME% --resource-group %RESOURCE_GROUP% --query "properties.apiKey" -o tsv`) do set "SWA_TOKEN=%%T"
if "!SWA_TOKEN!"=="" (
  echo [ERROR] Could not read SWA deployment token for %SWA_NAME% in %RESOURCE_GROUP%.
  exit /b 1
)

:: Install api/ dependencies so they're in the ./api/node_modules folder
:: SWA CLI zips the api/ folder as-is; it needs node_modules present.
echo.
echo === npm install in api/ (for the Managed Function) ===
pushd api
call npm install --no-audit --no-fund || (popd & exit /b 1)
popd

echo.
echo === swa deploy — ships build/ (React) + api/ (Managed Function) ===
call swa deploy .\build --api-location .\api --deployment-token "!SWA_TOKEN!" --env production || exit /b 1

:: ── Done ──────────────────────────────────────────────────────────────────
echo.
echo ═══════════════════════════════════════════════════════════════════
echo Deploy complete.
echo   SWA   (React + api)   https://!SWA_NAME!.azurestaticapps.net
echo   Exact host:  az staticwebapp show --name %SWA_NAME% --resource-group %RESOURCE_GROUP% --query defaultHostname -o tsv
echo.
echo Remaining IT step (requires Contributor on the resource group):
echo   Set these app settings on the SWA so the Managed Function can
echo   authenticate users and call the Azure Function backend:
echo     JWT_SECRET, USERS, API_HOST,
echo     DTC_API_CODE, SAP_API_CODE, SUBSCRIPTION_CODE, FLOWS_API_CODE,
echo     SOURCE_APP_API_CODE, DEST_APP_API_CODE, APP_STATUS_API_CODE,
echo     DROPDOWN_VALUES_API_CODE, FILE_STATUS_SUMMARY_CODE,
echo     AUDIT_EMAIL_EXPORT_CODE
echo   Command shape:
echo     az staticwebapp appsettings set --name %SWA_NAME% --resource-group %RESOURCE_GROUP% ^
echo       --setting-names KEY1=value1 KEY2=value2 ...
echo ═══════════════════════════════════════════════════════════════════

endlocal
