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
IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/cloud-run-source-deploy/${SERVICE}:$(git rev-parse --short HEAD)-$(date +%Y%m%d%H%M%S)"

if [[ -z "${ADK_URL}" ]]; then
  echo "Could not resolve ADK backend URL." >&2
  echo "Deploy the backend first (npm run gcp:deploy:adk) or set VITE_ADK_API_URL." >&2
  exit 1
fi

echo "Building web frontend image with VITE_ADK_API_URL=${ADK_URL}..."
gcloud builds submit . \
  --project "${PROJECT}" \
  --config "${SCRIPT_DIR}/cloudbuild-web.yaml" \
  --substitutions "_IMAGE=${IMAGE},_VITE_ADK_API_URL=${ADK_URL}"

echo "Deploying web frontend (${SERVICE})..."
gcloud run deploy "${SERVICE}" \
  --image "${IMAGE}" \
  --project "${PROJECT}" \
  --region "${REGION}" \
  --allow-unauthenticated

WEB_URL="$(gcloud run services describe "${SERVICE}" \
  --project "${PROJECT}" \
  --region "${REGION}" \
  --format 'value(status.url)')"

echo ""
echo "Web frontend deployed: ${WEB_URL}"
echo "Backend URL baked into build: ${ADK_URL}"
