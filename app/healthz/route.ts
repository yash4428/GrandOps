// Kept for Cloud Run's startup probe, which calls the container directly (external /healthz is reserved by Cloud Run).
export { GET } from "../health/route";
export const dynamic = "force-dynamic";
