export interface Round { iid: number; attack: string; startedAt: string; detectedAt: string | null; recoveredAt: string | null; detected: boolean }

const mins = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 60_000;
const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : null);

/** Pure. */
export function scoreboard(rounds: Round[]) {
  const sorted = [...rounds].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const last = sorted.at(-1);
  return {
    rounds: rounds.length,
    detected: rounds.filter((r) => r.detected).length,
    mttdMinutes: mean(rounds.filter((r) => r.detectedAt).map((r) => mins(r.startedAt, r.detectedAt!))),
    mttrMinutes: mean(rounds.filter((r) => r.recoveredAt).map((r) => mins(r.startedAt, r.recoveredAt!))),
    last: last ? { attack: last.attack, outcome: last.recoveredAt ? "recovered" : last.detected ? "detected" : "open" } : undefined,
    updatedAt: new Date().toISOString(),
  };
}
