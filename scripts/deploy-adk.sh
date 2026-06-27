#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=gcp-common.sh
source "${SCRIPT_DIR}/gcp-common.sh"

require_gcp_project

PROJECT="${GOOGLE_CLOUD_PROJECT}"
REGION="$(gcp_region)"
SERVICE="$(adk_service_name)"
LOCATION="${GOOGLE_CLOUD_LOCATION:-global}"
VERTEX_LOCATION="${AGENT_COUNCIL_VERTEX_LOCATION:-global}"
MODEL="${AGENT_COUNCIL_MODEL:-gemini-3.5-flash}"
TTS_ENABLED="${AGENT_COUNCIL_TTS_ENABLED:-true}"
TTS_MODEL="${AGENT_COUNCIL_TTS_MODEL:-gemini-2.5-flash-preview-tts}"

echo "Deploying ADK backend (${SERVICE}) to ${REGION}..."
gcloud run deploy "${SERVICE}" \
  --source adk \
  --project "${PROJECT}" \
  --region "${REGION}" \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_GENAI_USE_VERTEXAI=True,GOOGLE_CLOUD_PROJECT=${PROJECT},GOOGLE_CLOUD_LOCATION=${LOCATION},AGENT_COUNCIL_VERTEX_LOCATION=${VERTEX_LOCATION},AGENT_COUNCIL_MODEL=${MODEL},AGENT_COUNCIL_TTS_ENABLED=${TTS_ENABLED},AGENT_COUNCIL_TTS_MODEL=${TTS_MODEL},ADK_ALLOW_ORIGINS=*"

ADK_URL="$(resolve_adk_url)"
echo ""
echo "ADK backend deployed: ${ADK_URL}"
echo "Deploy the frontend with: npm run gcp:deploy:web"
