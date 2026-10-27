import "server-only";
import { gcpAccessToken } from "../gcp/token";

const LANG: Record<string, string> = { hi: "hi-IN", pa: "pa-IN", en: "en-IN" };

/** Google Cloud Speech-to-Text (v1 REST). Returns null when unavailable. */
export async function transcribe(audioBase64: string, locale: string): Promise<string | null> {
  if (process.env.SPEECH_ENABLED !== "true") return null;
  const token = await gcpAccessToken();
  if (!token) return null;
  const res = await fetch("https://speech.googleapis.com/v1/speech:recognize", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "x-goog-user-project": process.env.GOOGLE_CLOUD_PROJECT ?? "" },
    body: JSON.stringify({
      config: { encoding: "WEBM_OPUS", sampleRateHertz: 48000, languageCode: LANG[locale] ?? "hi-IN", alternativeLanguageCodes: ["hi-IN", "pa-IN"], enableAutomaticPunctuation: true },
      audio: { content: audioBase64 },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { results?: { alternatives?: { transcript?: string }[] }[] };
  return (body.results ?? []).map((r) => r.alternatives?.[0]?.transcript ?? "").join(" ").trim() || null;
}
