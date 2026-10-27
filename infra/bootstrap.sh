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

# Terraform-compatible CLI: terraform or tofu if present, else OpenTofu (MPL-2.0) into ~/bin.
TFBIN="$(command -v tofu || command -v terraform || true)"
# Cloud Shell ships a "terraform" stub that only prints install hints, so check for a real version.
if [ -z "$TFBIN" ] || ! "$TFBIN" version 2>/dev/null | grep -qE "^(Terraform|OpenTofu) v"; then
  echo "Installing OpenTofu 1.10.0 into ~/bin..."
  mkdir -p "$HOME/bin" && cd "$(mktemp -d)"
  curl -fsSLo tofu.zip https://github.com/opentofu/opentofu/releases/download/v1.10.0/tofu_1.10.0_linux_amd64.zip
  unzip -oq tofu.zip tofu -d "$HOME/bin" && cd - >/dev/null
  TFBIN="$HOME/bin/tofu"
fi
"$TFBIN" version | head -1 | grep -E "^(Terraform|OpenTofu) v" || { echo "No working terraform/tofu found." >&2; exit 1; }

cd "$(dirname "$0")/terraform"
printf 'terraform {\n  backend "local" {}\n}\n' > backend_override.tf
"$TFBIN" init -input=false -reconfigure >/dev/null

echo "Creating APIs and secrets..."
"$TFBIN" apply -input=false -auto-approve "${TF[@]}" -target=google_project_service.apis -target=google_secret_manager_secret.app

# Cloud Run will not start with a secret that has no version. "unset" means "feature off" in the app.
for s in gitlab-read-token reports-issue-token error-tracking-dsn; do
  if [ -z "$(gcloud secrets versions list "$s" --limit=1 --format='value(name)')" ]; then
    printf unset | gcloud secrets versions add "$s" --data-file=- >/dev/null
  fi
done

echo "Creating Cloud Run, Firestore, Artifact Registry and Workload Identity (2-4 minutes)..."
"$TFBIN" apply -input=false -auto-approve "${TF[@]}"

cat <<EOF

Done. Add these in GitLab: Settings > CI/CD > Variables > Add variable
(Type: Variable, untick "Protect variable" only if deploys must run outside main):

  GCP_PROJECT_ID    = $PROJECT_ID
  GCP_WIF_PROVIDER  = $("$TFBIN" output -raw wif_provider)
  GCP_DEPLOY_SA     = $("$TFBIN" output -raw deployer_sa)
  STAGING_URL       = $("$TFBIN" output -raw staging_url)
  PROD_URL          = $("$TFBIN" output -raw prod_url)
EOF
