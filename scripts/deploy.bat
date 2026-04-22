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

echo.
echo === swa deploy (this uploads build\ to %SWA_NAME%) ===
call swa deploy .\build --deployment-token "!SWA_TOKEN!" --env production || exit /b 1

:: ── Deploy proxy App Service + link backend ───────────────────────────────
echo.
echo === Deploying server.js to App Service + linking as SWA backend ===
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-proxy.ps1" ^
  -ResourceGroup %RESOURCE_GROUP% ^
  -SwaName       %SWA_NAME%       ^
  -ProxyName     %PROXY_NAME%     ^
  -PlanName      %PLAN_NAME%      ^
  -Location      %LOCATION%
if errorlevel 1 (
  echo [ERROR] deploy-proxy.ps1 failed.
  exit /b 1
)

:: ── Done ──────────────────────────────────────────────────────────────────
echo.
echo ═══════════════════════════════════════════════════════════════════
echo Deploy complete.
echo   SWA       https://!SWA_NAME!.azurestaticapps.net
echo             (exact host: run  az staticwebapp show --name %SWA_NAME% --resource-group %RESOURCE_GROUP% --query defaultHostname -o tsv)
echo   Proxy     https://%PROXY_NAME%.azurewebsites.net
echo.
echo Smoke test:
echo   1. Open the SWA URL in your browser, log in.
echo   2. DevTools Network tab: /api/auth/login should be a relative URL
echo      (NOT http://localhost:4000).
echo   3. If login still fails, tail proxy logs:
echo        az webapp log tail --name %PROXY_NAME% --resource-group %RESOURCE_GROUP%
echo ═══════════════════════════════════════════════════════════════════

endlocal
