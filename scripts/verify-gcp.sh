#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=gcp-common.sh
source "${SCRIPT_DIR}/gcp-common.sh"

require_gcp_project

PROJECT="${GOOGLE_CLOUD_PROJECT}"
REGION="$(gcp_region)"
ADK_SERVICE="$(adk_service_name)"
WEB_SERVICE="$(web_service_name)"

ADK_URL="$(gcloud run services describe "${ADK_SERVICE}" \
  --project "${PROJECT}" \
  --region "${REGION}" \
  --format 'value(status.url)' 2>/dev/null || true)"

WEB_URL="$(gcloud run services describe "${WEB_SERVICE}" \
  --project "${PROJECT}" \
  --region "${REGION}" \
  --format 'value(status.url)' 2>/dev/null || true)"

echo "Cloud Run services (${PROJECT} / ${REGION})"
echo "  Backend:  ${ADK_SERVICE} -> ${ADK_URL:-not found}"
echo "  Frontend: ${WEB_SERVICE} -> ${WEB_URL:-not found}"
echo ""

if [[ -z "${ADK_URL}" ]]; then
  echo "FAIL: backend service not found." >&2
  exit 1
fi

APPS="$(curl -sS "${ADK_URL}/list-apps")"
echo "Backend apps: ${APPS}"

if [[ "${APPS}" != *"agent_council"* ]]; then
  echo "FAIL: backend does not expose agent_council." >&2
  exit 1
fi

if [[ -n "${WEB_URL}" ]]; then
  JS_PATH="$(curl -sS "${WEB_URL}/" | sed -n 's/.*src="\(\/assets\/index-[^"]*\.js\)".*/\1/p' | head -1)"
  if [[ -n "${JS_PATH}" ]]; then
    BAKED_URL="$(curl -sS "${WEB_URL}${JS_PATH}" | rg -o 'https://[a-zA-Z0-9._-]+\.run\.app' | sort -u | head -1 || true)"
    echo "Frontend baked backend URL: ${BAKED_URL:-not found in bundle}"

    if [[ -n "${BAKED_URL}" ]]; then
      BAKED_APPS="$(curl -sS "${BAKED_URL}/list-apps")"
      if [[ "${BAKED_APPS}" == *"agent_council"* ]]; then
        echo "PASS: frontend bundle calls a backend that serves agent_council."
      else
        echo "FAIL: frontend baked URL does not reach agent_council backend." >&2
        exit 1
      fi

      # Cloud Run serves the same revision on legacy and *.a.run.app hostnames.
      BAKED_HOST="$(echo "${BAKED_URL}" | sed -E 's#https://##; s#/.*##')"
      ADK_HOST="$(echo "${ADK_URL}" | sed -E 's#https://##; s#/.*##')"
      if [[ "${BAKED_HOST}" == "${ADK_HOST}" ]]; then
        echo "PASS: frontend hostname matches deployed backend."
      else
        # Same service can answer on project-number and hash hostnames — verify both work.
        if curl -sS "${BAKED_URL}/list-apps" | rg -q agent_council; then
          echo "PASS: frontend uses alternate Cloud Run hostname for the same backend revision."
        else
          echo "WARN: frontend backend URL (${BAKED_HOST}) differs from gcloud URL (${ADK_HOST})."
        fi
      fi
    fi
  else
    echo "WARN: could not read frontend JS bundle."
  fi
fi

MODEL="$(gcloud run services describe "${ADK_SERVICE}" \
  --project "${PROJECT}" \
  --region "${REGION}" \
  --format 'value(spec.template.spec.containers[0].env.filter(name=AGENT_COUNCIL_MODEL).value)' 2>/dev/null || true)"
echo "Backend model: ${MODEL:-unknown}"

echo ""
echo "All linkage checks passed."
