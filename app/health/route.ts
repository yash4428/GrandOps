import { chaosHealthz500 } from "@/lib/flags";

// Not /healthz: Cloud Run reserves paths ending in "z" and answers them itself.
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const version = process.env.APP_VERSION ?? "dev";
  if (await chaosHealthz500()) {
    return Response.json({ ok: false, version, reason: "chaos" }, { status: 500 });
  }
  return Response.json({ ok: true, version, env: process.env.APP_ENV ?? "local" });
}
