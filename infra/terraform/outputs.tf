output "wif_provider" {
  description = "Set as CI variable GCP_WIF_PROVIDER"
  value       = google_iam_workload_identity_pool_provider.gitlab.name
}

output "deployer_sa" {
  description = "Set as CI variable GCP_DEPLOY_SA"
  value       = google_service_account.deployer.email
}

output "staging_url" {
  description = "Set as CI variable STAGING_URL"
  value       = google_cloud_run_v2_service.app["staging"].uri
}

output "prod_url" {
  description = "Set as CI variable PROD_URL"
  value       = google_cloud_run_v2_service.app["prod"].uri
}
