#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=gcp-common.sh
source "${SCRIPT_DIR}/gcp-common.sh"

require_gcp_project

PROJECT="${GOOGLE_CLOUD_PROJECT}"
REGION="$(gcp_region)"

echo "Enabling required APIs on ${PROJECT}..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  aiplatform.googleapis.com \
  --project "${PROJECT}"

PROJECT_NUMBER="$(gcloud projects describe "${PROJECT}" --format='value(projectNumber)')"
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "Granting Vertex AI access to Cloud Run default service account..."
gcloud projects add-iam-policy-binding "${PROJECT}" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/aiplatform.user" \
  --quiet >/dev/null

echo ""
echo "One-time setup complete."
echo "  Project:  ${PROJECT}"
echo "  Region:   ${REGION}"
echo "  SA:       ${COMPUTE_SA} (roles/aiplatform.user)"
echo ""
echo "Next: npm run gcp:deploy"
