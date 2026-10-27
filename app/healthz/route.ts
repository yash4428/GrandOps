// Kept for Cloud Run's startup probe, which calls the container directly (external /healthz is reserved by Cloud Run).
export { GET, dynamic } from "../health/route";
