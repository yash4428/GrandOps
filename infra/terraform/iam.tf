# Runtime identity for Cloud Run.
resource "google_service_account" "runtime" {
  account_id   = "app-runtime"
  display_name = "App runtime (Cloud Run)"
}

resource "google_project_iam_member" "runtime_roles" {
  for_each = toset(["roles/datastore.user", "roles/speech.client", "roles/logging.logWriter"])
  project  = var.project_id
  role     = each.value
  member   = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_secret_manager_secret_iam_member" "runtime_secrets" {
  for_each  = google_secret_manager_secret.app
  secret_id = each.value.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime.email}"
}

# Deployer identity, impersonated from GitLab CI via Workload Identity Federation. No keys.
resource "google_service_account" "deployer" {
  account_id   = "gitlab-deployer"
  display_name = "GitLab CI deployer (WIF)"
}

resource "google_project_iam_member" "deployer_roles" {
  for_each = toset([
    "roles/run.admin",
    "roles/artifactregistry.writer",
    "roles/iam.serviceAccountUser",
    "roles/monitoring.viewer",
  ])
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_iam_workload_identity_pool" "gitlab" {
  workload_identity_pool_id = "gitlab"
  display_name              = "GitLab CI"
  depends_on                = [google_project_service.apis]
}

resource "google_iam_workload_identity_pool_provider" "gitlab" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.gitlab.workload_identity_pool_id
  workload_identity_pool_provider_id = "gitlab-com"
  display_name                       = "gitlab.com OIDC"
  attribute_mapping = {
    "google.subject"            = "assertion.sub"
    "attribute.project_path"    = "assertion.project_path"
    "attribute.ref"             = "assertion.ref"
    "attribute.ref_protected"   = "assertion.ref_protected"
    "attribute.environment"     = "assertion.environment"
    "attribute.pipeline_source" = "assertion.pipeline_source"
  }
  # Only this project's protected refs may deploy.
  attribute_condition = "assertion.project_path == \"${var.gitlab_project_path}\" && assertion.ref_protected == \"true\""
  oidc {
    issuer_uri        = var.gitlab_url
    allowed_audiences = ["https://iam.googleapis.com/${google_iam_workload_identity_pool.gitlab.name}/providers/gitlab-com"]
  }
}

resource "google_service_account_iam_member" "deployer_wif" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.gitlab.name}/attribute.project_path/${var.gitlab_project_path}"
}
