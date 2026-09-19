#!/usr/bin/env bash
# ==============================================================================
# RESILIENCE AI — Google Secret Manager Provisioning Script
# ==============================================================================
# Sets up secrets required by Google Cloud Run:
#   1. resilience-jwt-secret
#   2. gemini-api-key-secret
#   3. resilience-db-secret
# Also grants Secret Accessor role to the Cloud Run service account.
# ==============================================================================

set -euo pipefail

if [ -z "${GOOGLE_CLOUD_PROJECT:-}" ]; then
  echo "Error: GOOGLE_CLOUD_PROJECT environment variable is not set."
  echo "Usage: export GOOGLE_CLOUD_PROJECT='your-project-id' && bash deployment/secrets-setup.sh"
  exit 1
fi

echo "==> Configuring Secret Manager for GCP Project: ${GOOGLE_CLOUD_PROJECT}"
gcloud config set project "${GOOGLE_CLOUD_PROJECT}"

# Ensure Secret Manager API is enabled
echo "==> Enabling secretmanager.googleapis.com..."
gcloud services enable secretmanager.googleapis.com

create_or_update_secret() {
  local secret_name="$1"
  local secret_val="$2"

  if gcloud secrets describe "${secret_name}" --project="${GOOGLE_CLOUD_PROJECT}" >/dev/null 2>&1; then
    echo "Secret '${secret_name}' already exists. Adding new version..."
    printf "%s" "${secret_val}" | gcloud secrets versions add "${secret_name}" --data-file=- --project="${GOOGLE_CLOUD_PROJECT}"
  else
    echo "Creating secret '${secret_name}'..."
    printf "%s" "${secret_val}" | gcloud secrets create "${secret_name}" --data-file=- --replication-policy="automatic" --project="${GOOGLE_CLOUD_PROJECT}"
  fi
}

# 1. JWT Secret
if [ -n "${JWT_SECRET:-}" ]; then
  echo "==> Provisioning JWT Secret..."
  create_or_update_secret "resilience-jwt-secret" "${JWT_SECRET}"
else
  echo "Notice: JWT_SECRET not exported. Generating a secure 64-character random string..."
  RANDOM_SECRET=$(openssl rand -hex 32 2>/dev/null || python3 -c 'import secrets; print(secrets.token_hex(32))')
  create_or_update_secret "resilience-jwt-secret" "${RANDOM_SECRET}"
fi

# 2. Gemini AI Key
if [ -n "${GEMINI_API_KEY:-}" ]; then
  echo "==> Provisioning Gemini API Key..."
  create_or_update_secret "gemini-api-key-secret" "${GEMINI_API_KEY}"
else
  echo "Warning: GEMINI_API_KEY is not set. Creating placeholder secret."
  create_or_update_secret "gemini-api-key-secret" "placeholder-add-your-gemini-key"
fi

# 3. Database URL
if [ -n "${DATABASE_URL:-}" ]; then
  echo "==> Provisioning Cloud SQL Database URL..."
  create_or_update_secret "resilience-db-secret" "${DATABASE_URL}"
else
  echo "Notice: DATABASE_URL not set. Creating placeholder for Cloud SQL Unix socket format."
  PLACEHOLDER_DB="postgresql://resilience_user:REPLACE_PASSWORD@/resilience_db?host=/cloudsql/${GOOGLE_CLOUD_PROJECT}:asia-south1:resilience-db"
  create_or_update_secret "resilience-db-secret" "${PLACEHOLDER_DB}"
fi

# 4. Grant access to Cloud Run compute service account
echo "==> Granting Secret Accessor permissions to Cloud Run Service Account..."
PROJECT_NUMBER=$(gcloud projects describe "${GOOGLE_CLOUD_PROJECT}" --format="value(projectNumber)")
CLOUD_RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "Cloud Run Service Account: ${CLOUD_RUN_SA}"

for secret in resilience-jwt-secret gemini-api-key-secret resilience-db-secret; do
  gcloud secrets add-iam-policy-binding "${secret}" \
    --member="serviceAccount:${CLOUD_RUN_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --project="${GOOGLE_CLOUD_PROJECT}" >/dev/null
  echo "Granted roles/secretmanager.secretAccessor on '${secret}'"
done

echo "==> Secrets provisioning completed successfully!"
