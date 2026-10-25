// TIER 2 (dose-critical). Pure functions only.
import { addDays, dosesForDay, type DueDose, type IstDate, type Schedule } from "../schedule";

/** Minutes after the due time before a dose counts as missed. */
export const DEFAULT_GRACE_MINUTES = 60;

export interface DoseEvent {
  medicineId: string;
  /** The due time (UTC ISO) this event answers. */
  dueAtUtc: string;
  /** When the patient tapped "Dose taken" (UTC ISO). */
  takenAtUtc: string;
}

export type DoseStatus = "taken" | "due" | "upcoming" | "missed";

export interface DoseWithStatus extends DueDose {
  status: DoseStatus;
  takenAtUtc: string | null;
}

export function doseKey(medicineId: string, dueAtUtc: string): string {
  return `${medicineId}@${dueAtUtc}`;
}

/**
 * Status of one due dose at `nowMs`.
 * - taken: an event exists for it
 * - upcoming: due time is in the future
 * - due: due time passed but still inside the grace window
 * - missed: grace window passed with no event
 */
export function statusOf(dose: DueDose, taken: ReadonlySet<string>, nowMs: number, graceMinutes = DEFAULT_GRACE_MINUTES): DoseStatus {
  if (graceMinutes < 0) throw new RangeError("graceMinutes must be >= 0");
  if (taken.has(doseKey(dose.medicineId, dose.dueAtUtc))) return "taken";
  const due = Date.parse(dose.dueAtUtc);
  if (nowMs < due) return "upcoming";
  if (nowMs <= due + graceMinutes * 60_000) return "due";
  return "missed";
}

export function dayWithStatus(
  schedules: Schedule[],
  events: DoseEvent[],
  date: IstDate,
  nowMs: number,
  graceMinutes = DEFAULT_GRACE_MINUTES,
): DoseWithStatus[] {
  const takenAt = new Map(events.map((e) => [doseKey(e.medicineId, e.dueAtUtc), e.takenAtUtc]));
  const taken = new Set(takenAt.keys());
  return dosesForDay(schedules, date).map((d) => ({
    ...d,
    status: statusOf(d, taken, nowMs, graceMinutes),
    takenAtUtc: takenAt.get(doseKey(d.medicineId, d.dueAtUtc)) ?? null,
  }));
}

export interface AdherenceDay {
  date: IstDate;
  scheduled: number;
  taken: number;
  missed: number;
}

/** Per-day adherence for the `days` IST dates ending at `endDate` (inclusive), oldest first. */
export function adherence(
  schedules: Schedule[],
  events: DoseEvent[],
  endDate: IstDate,
  days: number,
  nowMs: number,
  graceMinutes = DEFAULT_GRACE_MINUTES,
): AdherenceDay[] {
  if (!Number.isInteger(days) || days < 1) throw new RangeError("days must be a positive integer");
  const out: AdherenceDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(endDate, -i);
    const doses = dayWithStatus(schedules, events, date, nowMs, graceMinutes);
    out.push({
      date,
      scheduled: doses.length,
      taken: doses.filter((d) => d.status === "taken").length,
      missed: doses.filter((d) => d.status === "missed").length,
    });
  }
  return out;
}

/** Whole-number adherence percent over the given days; null when nothing was scheduled. */
export function adherencePercent(days: AdherenceDay[]): number | null {
  const scheduled = days.reduce((n, d) => n + d.scheduled, 0);
  if (scheduled === 0) return null;
  const taken = days.reduce((n, d) => n + d.taken, 0);
  return Math.round((taken / scheduled) * 100);
}

/**
 * Validates a "mark taken" request. A dose can only be marked taken once,
 * and not earlier than `earlyMinutes` before it is due.
 */
export function canMarkTaken(dose: DueDose, taken: ReadonlySet<string>, nowMs: number, earlyMinutes = 120): boolean {
  if (taken.has(doseKey(dose.medicineId, dose.dueAtUtc))) return false;
  return nowMs >= Date.parse(dose.dueAtUtc) - earlyMinutes * 60_000;
}
