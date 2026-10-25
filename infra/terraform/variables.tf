variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "Region for user-facing services (users are in India). See docs/adr/0002-region.md."
  type        = string
  default     = "asia-south1"
}

variable "gitlab_project_path" {
  description = "GitLab project path allowed to impersonate the deployer, e.g. group/project"
  type        = string
}

variable "gitlab_url" {
  description = "GitLab instance URL (OIDC issuer)"
  type        = string
  default     = "https://gitlab.com"
}

variable "prod_min_instances" {
  description = "Prod min instances. 1 during judging avoids cold starts; 0 saves carbon and cost."
  type        = number
  default     = 0
}

variable "bootstrap_image" {
  description = "Image used only when a service is first created. CI deploys real images afterwards."
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
}
