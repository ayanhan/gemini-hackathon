#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=gcp-common.sh
source "${SCRIPT_DIR}/gcp-common.sh"

require_gcp_project

PROJECT="${GOOGLE_CLOUD_PROJECT}"
REGION="$(gcp_region)"
SERVICE="$(web_service_name)"
ADK_URL="$(resolve_adk_url)"

if [[ -z "${ADK_URL}" ]]; then
  echo "Could not resolve ADK backend URL." >&2
  echo "Deploy the backend first (npm run gcp:deploy:adk) or set VITE_ADK_API_URL." >&2
  exit 1
fi

echo "Deploying web frontend (${SERVICE}) with VITE_ADK_API_URL=${ADK_URL}..."
gcloud run deploy "${SERVICE}" \
  --source . \
  --project "${PROJECT}" \
  --region "${REGION}" \
  --allow-unauthenticated \
  --build-arg "VITE_ADK_API_URL=${ADK_URL}"

WEB_URL="$(gcloud run services describe "${SERVICE}" \
  --project "${PROJECT}" \
  --region "${REGION}" \
  --format 'value(status.url)')"

echo ""
echo "Web frontend deployed: ${WEB_URL}"
echo "Backend URL baked into build: ${ADK_URL}"
