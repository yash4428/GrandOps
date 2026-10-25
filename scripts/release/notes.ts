// Pure helpers for releases.
export function nextVersion(latest: string | null, bump: "major" | "minor" | "patch"): string {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(latest ?? "");
  const [ma, mi, pa] = m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0];
  if (!m) return "v0.1.0";
  if (bump === "major") return `v${ma + 1}.0.0`;
  if (bump === "minor") return `v${ma}.${mi + 1}.0`;
  return `v${ma}.${mi}.${pa + 1}`;
}

export function bumpFor(labels: string[]): "major" | "minor" | "patch" {
  if (labels.includes("breaking")) return "major";
  if (labels.includes("type::feature")) return "minor";
  return "patch";
}

const LANGS = ["en", "hi", "pa"] as const;

/**
 * Builder writes caregiver notes into the MR description:
 *   ## Caregiver notes
 *   - en: The 'Taken' button is bigger.
 *   - hi: ...
 *   - pa: ...
 */
export function caregiverNotes(mrDescription: string): Partial<Record<(typeof LANGS)[number], string>> {
  const section = /##\s*Caregiver notes\s*\n([\s\S]*?)(?=\n##\s|$)/i.exec(mrDescription)?.[1] ?? "";
  const out: Partial<Record<(typeof LANGS)[number], string>> = {};
  for (const l of LANGS) {
    const line = new RegExp(`^\\s*[-*]\\s*${l}\\s*:\\s*(.+)$`, "im").exec(section)?.[1]?.trim();
    if (line) out[l] = line;
  }
  return out;
}

export function releaseDescription(version: string, mr: { iid: number; title: string } | null, notes: ReturnType<typeof caregiverNotes>, sciG: number | null): string {
  const block = (l: string, title: string) => (notes[l as keyof typeof notes] ? [`### ${title}`, `<!-- notes:${l} -->`, `- ${notes[l as keyof typeof notes]}`, `<!-- /notes:${l} -->`, ""] : []);
  return [
    `## ${version}`,
    "",
    "### Developer notes",
    mr ? `- ${mr.title} (!${mr.iid})` : "- Maintenance release",
    "",
    ...block("en", "For caregivers (English)"),
    ...block("hi", "परिवार के लिए (हिन्दी)"),
    ...block("pa", "ਪਰਿਵਾਰ ਲਈ (ਪੰਜਾਬੀ)"),
    sciG === null ? "" : `🌱 This deployment: ${sciG} g CO₂e (SCI).`,
    "",
    "_Released by the pipeline after canary verification. Audit record: `audit/releases/" + version + ".md` on the data branch._",
  ].join("\n");
}
