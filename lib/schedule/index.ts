// TIER 2 (dose-critical). Pure functions only. Store UTC, display IST.
// India has no DST, so IST is a fixed UTC+05:30 offset. We still never use
// local-time Date math: every calculation goes through these helpers.

export const IST_OFFSET_MINUTES = 330;
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** A time of day in IST, "HH:MM" 24-hour. */
export type TimeOfDay = string;

/** A calendar date in IST, "YYYY-MM-DD". */
export type IstDate = string;

export interface Schedule {
  medicineId: string;
  /** Times of day in IST when a dose is due. */
  times: TimeOfDay[];
  /** First IST date (inclusive) the schedule applies. */
  startDate: IstDate;
  /** Last IST date (inclusive), or null for ongoing. */
  endDate: IstDate | null;
}

export interface DueDose {
  medicineId: string;
  /** UTC ISO timestamp when the dose is due. */
  dueAtUtc: string;
  /** IST date this dose belongs to. */
  istDate: IstDate;
  /** IST time of day. */
  time: TimeOfDay;
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseTimeOfDay(t: TimeOfDay): { hours: number; minutes: number } {
  const m = TIME_RE.exec(t);
  if (!m) throw new RangeError(`Invalid time of day: ${t}`);
  return { hours: Number(m[1]), minutes: Number(m[2]) };
}

export function parseIstDate(d: IstDate): { year: number; month: number; day: number } {
  const m = DATE_RE.exec(d);
  if (!m) throw new RangeError(`Invalid date: ${d}`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    throw new RangeError(`Invalid date: ${d}`);
  }
  return { year, month, day };
}

/** Converts an IST date + time of day to a UTC epoch in ms. */
export function istToUtcMs(date: IstDate, time: TimeOfDay): number {
  const { year, month, day } = parseIstDate(date);
  const { hours, minutes } = parseTimeOfDay(time);
  return Date.UTC(year, month - 1, day, hours, minutes) - IST_OFFSET_MINUTES * MINUTE_MS;
}

/** Returns the IST calendar date for a UTC instant. */
export function utcMsToIstDate(utcMs: number): IstDate {
  const ist = new Date(utcMs + IST_OFFSET_MINUTES * MINUTE_MS);
  return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}`;
}

/** Returns the IST time of day ("HH:MM") for a UTC instant. */
export function utcMsToIstTime(utcMs: number): TimeOfDay {
  const ist = new Date(utcMs + IST_OFFSET_MINUTES * MINUTE_MS);
  return `${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}`;
}

/** Adds whole days to an IST date. */
export function addDays(date: IstDate, days: number): IstDate {
  const { year, month, day } = parseIstDate(date);
  return utcMsToIstDate(Date.UTC(year, month - 1, day, 12) - IST_OFFSET_MINUTES * MINUTE_MS + days * DAY_MS);
}

export function isActiveOn(schedule: Schedule, date: IstDate): boolean {
  if (date < schedule.startDate) return false;
  if (schedule.endDate !== null && date > schedule.endDate) return false;
  return true;
}

/** All doses due on one IST date, sorted by time. */
export function dosesForDate(schedule: Schedule, date: IstDate): DueDose[] {
  if (!isActiveOn(schedule, date)) return [];
  const unique = [...new Set(schedule.times)].sort();
  return unique.map((time) => ({
    medicineId: schedule.medicineId,
    dueAtUtc: new Date(istToUtcMs(date, time)).toISOString(),
    istDate: date,
    time,
  }));
}

/** Doses due across all schedules for one IST date, sorted by due time. */
export function dosesForDay(schedules: Schedule[], date: IstDate): DueDose[] {
  return schedules
    .flatMap((s) => dosesForDate(s, date))
    .sort((a, b) => (a.dueAtUtc < b.dueAtUtc ? -1 : a.dueAtUtc > b.dueAtUtc ? 1 : a.medicineId.localeCompare(b.medicineId)));
}

/** Formats a UTC ISO timestamp for display in IST, e.g. "08:00". */
export function formatIstTime(utcIso: string): TimeOfDay {
  const ms = Date.parse(utcIso);
  if (Number.isNaN(ms)) throw new RangeError(`Invalid timestamp: ${utcIso}`);
  return utcMsToIstTime(ms);
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
