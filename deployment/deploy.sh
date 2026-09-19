#!/usr/bin/env bash
# ==============================================================================
# RESILIENCE AI — Production / Staging Deployment Script for Google Cloud
# ==============================================================================
# Deploys FastAPI backend and React frontend to Google Cloud Run.
#
# Usage:
#   ./deployment/deploy.sh [development|staging|production]
#
# Prerequisites:
#   - Google Cloud SDK (gcloud) installed and authenticated
#   - Active Google Cloud project configured with billing
#   - Cloud Run, Cloud Build, Container Registry, and Secret Manager APIs enabled
# ==============================================================================

set -euo pipefail

TARGET_ENV="${1:-${ENV:-production}}"
REGION="${GOOGLE_CLOUD_REGION:-asia-south1}"

echo "============================================================"
echo " RESILIENCE AI — Cloud Run Deployment (${TARGET_ENV^^})"
echo "============================================================"

# Verify GCP Project is set
if [ -z "${GOOGLE_CLOUD_PROJECT:-}" ]; then
  ACTIVE_PROJECT=$(gcloud config get-value project 2>/dev/null || true)
  if [ -z "$ACTIVE_PROJECT" ]; then
    echo "Error: GOOGLE_CLOUD_PROJECT is not set and no active gcloud project found."
    echo "Please run: gcloud config set project <your-project-id>"
    exit 1
  fi
  GOOGLE_CLOUD_PROJECT="$ACTIVE_PROJECT"
fi

echo "Target Project: ${GOOGLE_CLOUD_PROJECT}"
echo "Target Region:  ${REGION}"
echo "Environment:    ${TARGET_ENV}"

# Service naming
BACKEND_SERVICE="resilience-ai-backend"
FRONTEND_SERVICE="resilience-ai-frontend"
if [ "$TARGET_ENV" = "staging" ]; then
  BACKEND_SERVICE="resilience-ai-backend-staging"
  FRONTEND_SERVICE="resilience-ai-frontend-staging"
fi

# 1. Enable required GCP APIs
echo "==> [Step 1/5] Enabling required Google Cloud APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  logging.googleapis.com \
  --project="${GOOGLE_CLOUD_PROJECT}"

# 2. Build and push backend image
echo "==> [Step 2/5] Building & Pushing Backend Container Image..."
BACKEND_TAG="gcr.io/${GOOGLE_CLOUD_PROJECT}/${BACKEND_SERVICE}:latest"
gcloud builds submit ./backend \
  --tag "${BACKEND_TAG}" \
  --project="${GOOGLE_CLOUD_PROJECT}"

# 3. Deploy Backend to Cloud Run
echo "==> [Step 3/5] Deploying Backend to Cloud Run..."
CLOUDSQL_FLAG=""
if [ -n "${CLOUD_SQL_INSTANCE:-}" ]; then
  CLOUDSQL_FLAG="--add-cloudsql-instances=${CLOUD_SQL_INSTANCE}"
fi

gcloud run deploy "${BACKEND_SERVICE}" \
  --image "${BACKEND_TAG}" \
  --platform managed \
  --region "${REGION}" \
  --project="${GOOGLE_CLOUD_PROJECT}" \
  --allow-unauthenticated \
  --min-instances 1 \
  --max-instances 10 \
  --cpu 2 \
  --memory 2Gi \
  --timeout 300 \
  --set-env-vars "ENV=${TARGET_ENV},GOOGLE_CLOUD_PROJECT=${GOOGLE_CLOUD_PROJECT},GOOGLE_CLOUD_REGION=${REGION},LOG_LEVEL=INFO" \
  --set-secrets "JWT_SECRET=resilience-jwt-secret:latest,GEMINI_API_KEY=gemini-api-key-secret:latest,DATABASE_URL=resilience-db-secret:latest" \
  ${CLOUDSQL_FLAG}

BACKEND_URL=$(gcloud run services describe "${BACKEND_SERVICE}" \
  --platform managed \
  --region "${REGION}" \
  --project="${GOOGLE_CLOUD_PROJECT}" \
  --format 'value(status.url)')

echo "Backend Live at: ${BACKEND_URL}"

# 4. Build and push frontend image with live Backend API URL
echo "==> [Step 4/5] Building & Pushing Frontend Container Image with VITE_API_BASE_URL..."
FRONTEND_TAG="gcr.io/${GOOGLE_CLOUD_PROJECT}/${FRONTEND_SERVICE}:latest"

gcloud builds submit ./frontend \
  --tag "${FRONTEND_TAG}" \
  --project="${GOOGLE_CLOUD_PROJECT}"

# 5. Deploy Frontend to Cloud Run
echo "==> [Step 5/5] Deploying Frontend to Cloud Run..."
gcloud run deploy "${FRONTEND_SERVICE}" \
  --image "${FRONTEND_TAG}" \
  --platform managed \
  --region "${REGION}" \
  --project="${GOOGLE_CLOUD_PROJECT}" \
  --allow-unauthenticated \
  --min-instances 1 \
  --max-instances 10 \
  --cpu 1 \
  --memory 1Gi \
  --port 80

FRONTEND_URL=$(gcloud run services describe "${FRONTEND_SERVICE}" \
  --platform managed \
  --region "${REGION}" \
  --project="${GOOGLE_CLOUD_PROJECT}" \
  --format 'value(status.url)')

# Update Backend with Frontend Origin for CORS
echo "==> Configuring Backend CORS for Frontend Origin: ${FRONTEND_URL}"
gcloud run services update "${BACKEND_SERVICE}" \
  --platform managed \
  --region "${REGION}" \
  --project="${GOOGLE_CLOUD_PROJECT}" \
  --update-env-vars "FRONTEND_URL=${FRONTEND_URL},BACKEND_CORS_ORIGINS=${FRONTEND_URL}" >/dev/null

echo "============================================================"
echo " DEPLOYMENT SUCCESSFUL!"
echo "============================================================"
echo " Web Application: ${FRONTEND_URL}"
echo " API Docs:        ${BACKEND_URL}/api/docs"
echo " Health Status:   ${BACKEND_URL}/health"
echo " Liveness Probe:  ${BACKEND_URL}/health/liveness"
echo "============================================================"
