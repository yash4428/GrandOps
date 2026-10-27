#!/usr/bin/env bash
# One-time Google Cloud setup, run by a human project owner in Google Cloud Shell.
#   bash infra/bootstrap.sh <gcp-project-id>
# Creates everything in infra/terraform (Cloud Run staging + prod, Artifact Registry,
# Firestore, Secret Manager, Workload Identity Federation for GitLab CI; no keys),
# then prints the GitLab CI/CD variables to add. State stays local to Cloud Shell.
set -euo pipefail

PROJECT_ID="${1:?usage: bash infra/bootstrap.sh <gcp-project-id>}"
GITLAB_PATH="${GITLAB_PATH:-gitlab-ai-hackathon/transcend-october-2026/43704625/showcase}"
TF=(-var "project_id=$PROJECT_ID" -var "gitlab_project_path=$GITLAB_PATH")

gcloud config set project "$PROJECT_ID" >/dev/null
echo "Enabling base APIs (about 1 minute)..."
gcloud services enable cloudresourcemanager.googleapis.com serviceusage.googleapis.com iam.googleapis.com

cd "$(dirname "$0")/terraform"
printf 'terraform {\n  backend "local" {}\n}\n' > backend_override.tf
terraform init -input=false -reconfigure >/dev/null

echo "Creating APIs and secrets..."
terraform apply -input=false -auto-approve "${TF[@]}" -target=google_project_service.apis -target=google_secret_manager_secret.app

# Cloud Run will not start with a secret that has no version. "unset" means "feature off" in the app.
for s in gitlab-read-token reports-issue-token error-tracking-dsn; do
  if [ -z "$(gcloud secrets versions list "$s" --limit=1 --format='value(name)')" ]; then
    printf unset | gcloud secrets versions add "$s" --data-file=- >/dev/null
  fi
done

echo "Creating Cloud Run, Firestore, Artifact Registry and Workload Identity (2-4 minutes)..."
terraform apply -input=false -auto-approve "${TF[@]}"

cat <<EOF

Done. Add these in GitLab: Settings > CI/CD > Variables > Add variable
(Type: Variable, untick "Protect variable" only if deploys must run outside main):

  GCP_PROJECT_ID    = $PROJECT_ID
  GCP_WIF_PROVIDER  = $(terraform output -raw wif_provider)
  GCP_DEPLOY_SA     = $(terraform output -raw deployer_sa)
  STAGING_URL       = $(terraform output -raw staging_url)
  PROD_URL          = $(terraform output -raw prod_url)
EOF
