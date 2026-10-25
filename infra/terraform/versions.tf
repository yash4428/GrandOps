terraform {
  required_version = ">= 1.6"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
  # GitLab-managed state. Address/credentials come from TF_HTTP_* variables (see ci/terraform.yml).
  backend "http" {}
}

provider "google" {
  project = var.project_id
  region  = var.region
}
