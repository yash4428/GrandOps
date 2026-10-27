import { getRepo, type UserReport } from "@/lib/data";
import { log, reportError } from "@/lib/errors/report";
import { isLocale } from "@/lib/i18n/config";
import { fileIssue } from "@/lib/reports/gitlab-issue";
import { redact } from "@/lib/reports/redact";
import { transcribe } from "@/lib/reports/speech";

const REASONS = ["cantPress", "cantRead", "wrongLanguage", "slow", "wrongTime", "other"] as const;
const ROUTES = ["/", "/medicines", "/caregiver", "/whats-new", "/report"];
const MAX_AUDIO_BASE64 = 1_500_000; // ~1.1 MB, about 60 s of opus

const hits = new Map<string, number[]>();
function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > 5;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (rateLimited(ip)) return Response.json({ error: "rate_limited" }, { status: 429 });
    const body = (await req.json()) as Partial<{ reason: string; text: string; locale: string; route: string; audio: string; device: string }>;
    const reason = REASONS.find((r) => r === body.reason) ?? "other";
    const locale = isLocale(body.locale) ? body.locale : "en";
    const route = ROUTES.includes(body.route ?? "") ? (body.route as string) : "/";
    let text = typeof body.text === "string" ? body.text : "";
    let source: UserReport["source"] = "text";
    if (typeof body.audio === "string" && body.audio.length > 0 && body.audio.length <= MAX_AUDIO_BASE64) {
      const spoken = await transcribe(body.audio, locale);
      if (spoken) {
        text = [text, spoken].filter(Boolean).join("\n");
        source = "voice";
      }
    }
    const report: UserReport = {
      id: `R-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      createdAtUtc: new Date().toISOString(),
      locale,
      reason,
      route,
      text: redact(text),
      source,
      appVersion: process.env.APP_VERSION ?? "dev",
      device: redact(String(body.device ?? "unknown")).slice(0, 80),
      issueIid: null,
    };
    const repo = getRepo();
    await repo.addReport(report);
    const iid = await fileIssue(report);
    if (iid !== null) await repo.setReportIssue(report.id, iid);
    log("info", "user_report", { reason, locale, source, filed: iid !== null });
    return Response.json({ id: report.id, issueIid: iid }, { status: 201 });
  } catch (err) {
    await reportError(err, "/api/reports");
    return Response.json({ error: "failed" }, { status: 500 });
  }
}
