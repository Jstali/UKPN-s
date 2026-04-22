# ═══════════════════════════════════════════════════════════════════════════
# Deploy server.js as an Azure App Service and link it as the linked backend
# of the existing Static Web App. Run from the repo root.
#
# Pre-reqs on this machine:
#   - Azure CLI:  `az --version` works
#   - You've run `az login` and `az account set --subscription <…>`
#   - Node 20+ (for the JWT secret one-liner and for server.js itself)
#
# Usage:
#   .\scripts\deploy-proxy.ps1 \
#       -ResourceGroup ukpn-fileconnect-rg \
#       -SwaName       ukpn-fileconnect-swa \
#       -ProxyName     ukpn-fileconnect-proxy \
#       -PlanName      ukpn-fileconnect-plan \
#       -Location      westeurope
#
# Secrets (all *_API_CODE values, USERS JSON) must already be in .env in
# the repo root — the script reads them from there. Never paste them as
# arguments.
# ═══════════════════════════════════════════════════════════════════════════
[CmdletBinding()]
param(
  [Parameter(Mandatory)] [string]$ResourceGroup,
  [Parameter(Mandatory)] [string]$SwaName,
  [Parameter(Mandatory)] [string]$ProxyName,
  [Parameter(Mandatory)] [string]$PlanName,
  [string]$Location = "westeurope",
  [string]$Sku      = "B1",
  [string]$NodeVer  = "NODE:20-lts",
  [string]$EnvFile  = ".env"
)

$ErrorActionPreference = "Stop"

function Assert-AzReady {
  $sub = az account show --query "name" -o tsv 2>$null
  if (-not $sub) { throw "az CLI not authenticated. Run 'az login' first." }
  Write-Host "✔ Logged in to subscription: $sub" -ForegroundColor Green
}

function Read-DotEnv([string]$Path) {
  if (-not (Test-Path $Path)) { throw "Env file not found: $Path" }
  $map = @{}
  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
      $k, $v = $line -split '=', 2
      $map[$k.Trim()] = $v.Trim()
    }
  }
  return $map
}

Assert-AzReady

Write-Host "Reading env file: $EnvFile" -ForegroundColor Cyan
$envMap = Read-DotEnv $EnvFile

# Required for the proxy to start
foreach ($k in @('USERS','API_HOST')) {
  if (-not $envMap.ContainsKey($k) -or -not $envMap[$k]) {
    throw "$k missing in $EnvFile — fix before deploying."
  }
}

# Confirm the SWA exists, grab its hostname for CORS
Write-Host "Looking up SWA host…" -ForegroundColor Cyan
$swaHost = az staticwebapp show `
  --name $SwaName --resource-group $ResourceGroup `
  --query "defaultHostname" -o tsv

if (-not $swaHost) { throw "Static Web App '$SwaName' not found in '$ResourceGroup'." }
Write-Host "✔ SWA host: $swaHost" -ForegroundColor Green

# ── App Service Plan + Web App ────────────────────────────────────────────
Write-Host "`nCreating App Service plan '$PlanName' (idempotent)…" -ForegroundColor Cyan
az appservice plan create `
  --name $PlanName --resource-group $ResourceGroup `
  --location $Location --sku $Sku --is-linux `
  --only-show-errors 1>$null

Write-Host "Creating Web App '$ProxyName' (idempotent)…" -ForegroundColor Cyan
az webapp create `
  --name $ProxyName --resource-group $ResourceGroup `
  --plan $PlanName --runtime $NodeVer `
  --only-show-errors 1>$null

Write-Host "Setting startup command…" -ForegroundColor Cyan
az webapp config set `
  --name $ProxyName --resource-group $ResourceGroup `
  --startup-file "node server.js" `
  --only-show-errors 1>$null

# ── Env vars ──────────────────────────────────────────────────────────────
Write-Host "Generating fresh JWT_SECRET…" -ForegroundColor Cyan
$jwt = node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# Build the settings array — everything from .env that the proxy actually reads,
# plus NODE_ENV, FRONTEND_ORIGIN, and a freshly-minted JWT_SECRET.
$passThrough = @(
  'API_HOST','USERS',
  'DTC_API_CODE','SAP_API_CODE','SUBSCRIPTION_CODE','FLOWS_API_CODE',
  'SOURCE_APP_API_CODE','DEST_APP_API_CODE','APP_STATUS_API_CODE',
  'DROPDOWN_VALUES_API_CODE','FILE_STATUS_SUMMARY_CODE','AUDIT_EMAIL_EXPORT_CODE',
  'DTC_DOWNLOAD_API_CODE','DTC_PREVIEW_API_CODE','REDIS_URL'
)

$kv = @(
  "NODE_ENV=production",
  "JWT_SECRET=$jwt",
  "FRONTEND_ORIGIN=https://$swaHost"
)
foreach ($k in $passThrough) {
  if ($envMap.ContainsKey($k) -and $envMap[$k]) {
    $kv += "$k=$($envMap[$k])"
  }
}

Write-Host "Pushing $($kv.Count) app settings…" -ForegroundColor Cyan
az webapp config appsettings set `
  --name $ProxyName --resource-group $ResourceGroup `
  --settings @kv `
  --only-show-errors 1>$null

# ── Zip + deploy ──────────────────────────────────────────────────────────
$zip = Join-Path $PSScriptRoot "..\proxy-deploy.zip"
$zip = (Resolve-Path -LiteralPath (Split-Path $zip) -ErrorAction SilentlyContinue).Path + "\" + (Split-Path $zip -Leaf)

Write-Host "Packaging server.js + manifests…" -ForegroundColor Cyan
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive `
  -Path server.js, package.json, package-lock.json `
  -DestinationPath $zip

Write-Host "Uploading zip to App Service…" -ForegroundColor Cyan
az webapp deploy `
  --name $ProxyName --resource-group $ResourceGroup `
  --src-path $zip --type zip `
  --only-show-errors 1>$null

Remove-Item $zip

# ── Smoke test ────────────────────────────────────────────────────────────
Write-Host "`nWaiting for cold start, then probing /health…" -ForegroundColor Cyan
Start-Sleep -Seconds 15
$healthUrl = "https://$ProxyName.azurewebsites.net/health"
try {
  $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 30
  Write-Host "✔ /health responded: $(ConvertTo-Json $health -Compress)" -ForegroundColor Green
} catch {
  Write-Warning "Proxy /health did not respond yet. Run:"
  Write-Warning "  az webapp log tail --name $ProxyName --resource-group $ResourceGroup"
}

# ── Link backend ──────────────────────────────────────────────────────────
Write-Host "`nLinking App Service as SWA backend…" -ForegroundColor Cyan
$proxyId = az webapp show --name $ProxyName --resource-group $ResourceGroup --query id -o tsv
az staticwebapp backends link `
  --name $SwaName --resource-group $ResourceGroup `
  --backend-resource-id $proxyId `
  --backend-region $Location `
  --only-show-errors 1>$null

Write-Host "`n════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "Deploy complete." -ForegroundColor Green
Write-Host "  SWA      : https://$swaHost"
Write-Host "  Proxy    : https://$ProxyName.azurewebsites.net"
Write-Host "  Log tail : az webapp log tail --name $ProxyName --resource-group $ResourceGroup"
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Green
