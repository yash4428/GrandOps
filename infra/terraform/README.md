# Infrastructure (Google Cloud)

Cloud Run (staging + prod, `asia-south1`), Artifact Registry, Firestore (Native), Secret Manager, and Workload Identity Federation so GitLab CI deploys **without service-account keys**.

## First-time bootstrap (Yash, once, from a laptop)

CI cannot authenticate until WIF exists, so the first apply runs locally with your own gcloud login:

```bash
gcloud auth application-default login
cd infra/terraform
tofu init -backend-config="address=https://gitlab.com/api/v4/projects/<PROJECT_ID>/terraform/state/default" \
  -backend-config="lock_address=https://gitlab.com/api/v4/projects/<PROJECT_ID>/terraform/state/default/lock" \
  -backend-config="unlock_address=https://gitlab.com/api/v4/projects/<PROJECT_ID>/terraform/state/default/lock" \
  -backend-config="username=<your-gitlab-username>" -backend-config="password=<a PAT with api scope>" \
  -backend-config="lock_method=POST" -backend-config="unlock_method=DELETE" -backend-config="retry_wait_min=5"
tofu apply -var project_id=<GCP_PROJECT_ID> -var gitlab_project_path=<group/project>
```

Then copy the outputs into GitLab CI/CD variables: `GCP_WIF_PROVIDER`, `GCP_DEPLOY_SA`, `STAGING_URL`, `PROD_URL`, plus `GCP_PROJECT_ID`. Add secret values in Secret Manager (`gitlab-read-token`, `reports-issue-token`, `error-tracking-dsn`).

After bootstrap, `terraform:plan` runs on MRs and `terraform:apply` on `main` (changes under `infra/`).

The HCL is plain Terraform. CI runs it with OpenTofu (MPL-2.0, OSI-approved) because Terraform ≥ 1.6 is BUSL. `terraform` works identically locally.
