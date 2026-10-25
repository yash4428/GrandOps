# Cloud Run services. CI owns image, env vars and traffic after creation (see ci/deploy.yml).
locals {
  envs = {
    staging = { name = "app-staging", min = 0, max = 2, app_env = "staging" }
    prod    = { name = "app-prod", min = var.prod_min_instances, max = 4, app_env = "production" }
  }
}

resource "google_cloud_run_v2_service" "app" {
  for_each            = local.envs
  name                = each.value.name
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account = google_service_account.runtime.email
    scaling {
      min_instance_count = each.value.min
      max_instance_count = each.value.max
    }
    containers {
      image = var.bootstrap_image
      resources {
        limits            = { cpu = "1", memory = "512Mi" }
        cpu_idle          = true
        startup_cpu_boost = true
      }
      env {
        name  = "APP_ENV"
        value = each.value.app_env
      }
      env {
        name  = "DATA_BACKEND"
        value = "firestore"
      }
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      env {
        name  = "SPEECH_ENABLED"
        value = "true"
      }
      env {
        name = "GITLAB_READ_TOKEN"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.app["gitlab-read-token"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "REPORTS_ISSUE_TOKEN"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.app["reports-issue-token"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "ERROR_TRACKING_DSN"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.app["error-tracking-dsn"].secret_id
            version = "latest"
          }
        }
      }
      startup_probe {
        http_get {
          path = "/healthz"
        }
      }
    }
  }

  lifecycle {
    # CI deploys new revisions and manages canary traffic.
    ignore_changes = [template[0].containers[0].image, template[0].containers[0].env, traffic, client, client_version, template[0].revision, template[0].labels]
  }
  depends_on = [google_project_service.apis, google_secret_manager_secret_iam_member.runtime_secrets]
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  for_each = google_cloud_run_v2_service.app
  name     = each.value.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}
