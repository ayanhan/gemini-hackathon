#!/usr/bin/env bash
set -euo pipefail

require_gcp_project() {
  if [[ -z "${GOOGLE_CLOUD_PROJECT:-}" ]]; then
    echo "GOOGLE_CLOUD_PROJECT must be set (your GCP project id)." >&2
    echo "Example: export GOOGLE_CLOUD_PROJECT=your-project-id" >&2
    exit 1
  fi
}

gcp_region() {
  echo "${CLOUD_RUN_REGION:-us-central1}"
}

adk_service_name() {
  echo "${ADK_CLOUD_RUN_SERVICE:-venn-backend}"
}

web_service_name() {
  echo "${WEB_CLOUD_RUN_SERVICE:-venn-frontend}"
}

resolve_adk_url() {
  local project region service
  project="${GOOGLE_CLOUD_PROJECT}"
  region="$(gcp_region)"
  service="$(adk_service_name)"

  if [[ -n "${VITE_ADK_API_URL:-}" ]]; then
    echo "${VITE_ADK_API_URL}"
    return
  fi

  gcloud run services describe "${service}" \
    --project "${project}" \
    --region "${region}" \
    --format 'value(status.url)'
}
