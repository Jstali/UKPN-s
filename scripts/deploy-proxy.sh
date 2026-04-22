#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Deploy server.js as an Azure App Service and link it as the linked backend
# of the existing Static Web App. macOS / Linux counterpart of deploy-proxy.ps1.
#
# Pre-reqs on this machine:
#   - Azure CLI:  `az --version` works
#   - You've run `az login` and `az account set --subscription <…>`
#   - Node 20+ (for the JWT secret one-liner and for server.js itself)
#   - `zip` on PATH
#
# Usage (edit the EDIT THESE block or pass via env):
#   RESOURCE_GROUP=ukpn-fileconnect-rg \
#   SWA_NAME=ukpn-fileconnect-swa \
#   PROXY_NAME=ukpn-fileconnect-proxy \
#   PLAN_NAME=ukpn-fileconnect-plan \
#   LOCATION=westeurope \
#   ./scripts/deploy-proxy.sh
#
# Secrets (all *_API_CODE values, USERS JSON) must already be in .env in
# the repo root — the script reads them from there. Never paste them as
# arguments.
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

# ── EDIT THESE (or export as env vars before calling) ─────────────────────
RESOURCE_GROUP=${RESOURCE_GROUP:-ukpn-fileconnect-rg}
SWA_NAME=${SWA_NAME:-ukpn-fileconnect-swa}
PROXY_NAME=${PROXY_NAME:-ukpn-fileconnect-proxy}
PLAN_NAME=${PLAN_NAME:-ukpn-fileconnect-plan}
LOCATION=${LOCATION:-westeurope}
SKU=${SKU:-B1}
NODE_VER=${NODE_VER:-NODE:20-lts}
ENV_FILE=${ENV_FILE:-.env}

# ── Sanity checks ─────────────────────────────────────────────────────────
sub_name=$(az account show --query "name" -o tsv 2>/dev/null || true)
[[ -z "$sub_name" ]] && { echo "az not authenticated. Run 'az login'." >&2; exit 1; }
echo "✔ Logged in to subscription: $sub_name"

[[ ! -f "$ENV_FILE" ]] && { echo "Env file not found: $ENV_FILE" >&2; exit 1; }

# Read .env into shell vars (skip blank/comment lines, keep value as-is)
get_env() {
  local key="$1"
  local line
  line=$(grep -E "^${key}=" "$ENV_FILE" | head -1 || true)
  [[ -z "$line" ]] && return 1
  echo "${line#${key}=}"
}

for k in USERS API_HOST; do
  if ! get_env "$k" >/dev/null; then
    echo "$k missing in $ENV_FILE — fix before deploying." >&2
    exit 1
  fi
done

echo "Looking up SWA host…"
SWA_HOST=$(az staticwebapp show \
  --name "$SWA_NAME" --resource-group "$RESOURCE_GROUP" \
  --query "defaultHostname" -o tsv)
[[ -z "$SWA_HOST" ]] && { echo "SWA '$SWA_NAME' not found in '$RESOURCE_GROUP'." >&2; exit 1; }
echo "✔ SWA host: $SWA_HOST"

# ── App Service Plan + Web App ────────────────────────────────────────────
echo ""
echo "Creating App Service plan '$PLAN_NAME' (idempotent)…"
az appservice plan create \
  --name "$PLAN_NAME" --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" --sku "$SKU" --is-linux \
  --only-show-errors > /dev/null

echo "Creating Web App '$PROXY_NAME' (idempotent)…"
az webapp create \
  --name "$PROXY_NAME" --resource-group "$RESOURCE_GROUP" \
  --plan "$PLAN_NAME" --runtime "$NODE_VER" \
  --only-show-errors > /dev/null

echo "Setting startup command…"
az webapp config set \
  --name "$PROXY_NAME" --resource-group "$RESOURCE_GROUP" \
  --startup-file "node server.js" \
  --only-show-errors > /dev/null

# ── Env vars ──────────────────────────────────────────────────────────────
echo "Generating fresh JWT_SECRET…"
JWT=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")

# Build the settings array — everything from .env that the proxy actually reads,
# plus NODE_ENV, FRONTEND_ORIGIN, and the freshly-minted JWT_SECRET.
SETTINGS=(
  "NODE_ENV=production"
  "JWT_SECRET=$JWT"
  "FRONTEND_ORIGIN=https://$SWA_HOST"
)

PASS_THROUGH=(
  API_HOST USERS
  DTC_API_CODE SAP_API_CODE SUBSCRIPTION_CODE FLOWS_API_CODE
  SOURCE_APP_API_CODE DEST_APP_API_CODE APP_STATUS_API_CODE
  DROPDOWN_VALUES_API_CODE FILE_STATUS_SUMMARY_CODE AUDIT_EMAIL_EXPORT_CODE
  DTC_DOWNLOAD_API_CODE DTC_PREVIEW_API_CODE REDIS_URL
)
for k in "${PASS_THROUGH[@]}"; do
  if v=$(get_env "$k"); then
    [[ -n "$v" ]] && SETTINGS+=("$k=$v")
  fi
done

echo "Pushing ${#SETTINGS[@]} app settings…"
az webapp config appsettings set \
  --name "$PROXY_NAME" --resource-group "$RESOURCE_GROUP" \
  --settings "${SETTINGS[@]}" \
  --only-show-errors > /dev/null

# ── Zip + deploy ──────────────────────────────────────────────────────────
ZIP="proxy-deploy.zip"
echo "Packaging server.js + manifests…"
rm -f "$ZIP"
zip -q "$ZIP" server.js package.json package-lock.json

echo "Uploading zip to App Service…"
az webapp deploy \
  --name "$PROXY_NAME" --resource-group "$RESOURCE_GROUP" \
  --src-path "$ZIP" --type zip \
  --only-show-errors > /dev/null
rm "$ZIP"

# ── Smoke test ────────────────────────────────────────────────────────────
echo ""
echo "Waiting for cold start, then probing /health…"
sleep 15
HEALTH_URL="https://$PROXY_NAME.azurewebsites.net/health"
if curl -fsSL "$HEALTH_URL" > /tmp/proxy_health.json 2>/dev/null; then
  echo "✔ /health responded: $(cat /tmp/proxy_health.json)"
else
  echo "⚠ /health did not respond yet. Tail logs:"
  echo "  az webapp log tail --name $PROXY_NAME --resource-group $RESOURCE_GROUP"
fi

# ── Link backend ──────────────────────────────────────────────────────────
echo ""
echo "Linking App Service as SWA backend…"
PROXY_ID=$(az webapp show --name "$PROXY_NAME" --resource-group "$RESOURCE_GROUP" --query id -o tsv)
az staticwebapp backends link \
  --name "$SWA_NAME" --resource-group "$RESOURCE_GROUP" \
  --backend-resource-id "$PROXY_ID" \
  --backend-region "$LOCATION" \
  --only-show-errors > /dev/null

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "Deploy complete."
echo "  SWA      : https://$SWA_HOST"
echo "  Proxy    : https://$PROXY_NAME.azurewebsites.net"
echo "  Log tail : az webapp log tail --name $PROXY_NAME --resource-group $RESOURCE_GROUP"
echo "════════════════════════════════════════════════════════════════"
