// Pure: Playwright JSON report -> persona cards.
export const PERSONAS = {
  kamla: { name: "Kamla, 78", who: "hand tremor" },
  harbans: { name: "Harbans, 72", who: "low vision" },
  rano: { name: "Rano, 70", who: "reads only Punjabi" },
  mohan: { name: "Mohan, 81", who: "blind, screen reader" },
  bittu: { name: "Bittu's phone", who: "₹6,000 Android on 3G" },
} as const;
export type PersonaId = keyof typeof PERSONAS;

interface PwResult { status: string; attachments?: { name: string; path?: string }[]; errors?: { message?: string }[] }
interface PwTest { projectName: string; results: PwResult[]; annotations?: { type: string; description?: string }[] }
interface PwSpec { title: string; tests: PwTest[] }
interface PwSuite { title: string; specs?: PwSpec[]; suites?: PwSuite[] }
export interface PwReport { suites: PwSuite[] }

export interface Card {
  persona: PersonaId;
  passed: number;
  failed: number;
  experiences: string[];
  metrics: string[];
}

function* specs(s: PwSuite): Generator<PwSpec> {
  yield* s.specs ?? [];
  for (const c of s.suites ?? []) yield* specs(c);
}

export function cards(report: PwReport): Card[] {
  const out = new Map<PersonaId, Card>();
  for (const suite of report.suites) {
    for (const spec of specs(suite)) {
      for (const t of spec.tests) {
        const p = t.projectName as PersonaId;
        if (!(p in PERSONAS)) continue;
        const card = out.get(p) ?? { persona: p, passed: 0, failed: 0, experiences: [], metrics: [] };
        const last = t.results.at(-1);
        const ok = last?.status === "passed" || last?.status === "skipped";
        if (ok) card.passed++;
        else card.failed++;
        for (const a of t.annotations ?? []) {
          if (a.type.startsWith("violation:") && a.description && !ok) {
            try {
              card.experiences.push((JSON.parse(a.description) as { experience: string }).experience);
            } catch {
              /* ignore malformed annotation */
            }
          }
          if (a.type === "metric" && a.description) card.metrics.push(a.description);
        }
        if (!ok && !(t.annotations ?? []).some((a) => a.type.startsWith("violation:"))) {
          card.experiences.push(`${spec.title}: ${(last?.errors?.[0]?.message ?? "failed").split("\n")[0]!.slice(0, 160)}`);
        }
        out.set(p, card);
      }
    }
  }
  return (Object.keys(PERSONAS) as PersonaId[]).filter((p) => out.has(p)).map((p) => out.get(p)!);
}

export function renderComment(cs: Card[], jobUrl?: string): string {
  const lines = ["### 👵 Persona panel", ""];
  for (const c of cs) {
    const p = PERSONAS[c.persona];
    lines.push(`**${c.failed ? "❌" : "✅"} ${p.name}** (${p.who}): ${c.passed} passed, ${c.failed} failed`);
    for (const e of [...new Set(c.experiences)].slice(0, 5)) lines.push(`> ${e}`);
    for (const m of c.metrics) lines.push(`> 📈 \`${m}\``);
    lines.push("");
  }
  if (jobUrl) lines.push(`Screenshots and traces: ${jobUrl}/artifacts/browse`);
  lines.push("_Checks are deterministic (Playwright + axe-core). No AI decides pass/fail._");
  return lines.join("\n");
}
