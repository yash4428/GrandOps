import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  adherence,
  adherencePercent,
  canMarkTaken,
  dayWithStatus,
  doseKey,
  statusOf,
  type DoseEvent,
} from "@/lib/doses";
import { dosesForDate, istToUtcMs, type Schedule } from "@/lib/schedule";

const schedule: Schedule = { medicineId: "m1", times: ["08:00", "20:00"], startDate: "2026-10-01", endDate: null };
const [morning, evening] = dosesForDate(schedule, "2026-10-25");
const at = (time: string, date = "2026-10-25") => istToUtcMs(date, time);

describe("statusOf", () => {
  it("covers upcoming, due, missed and taken", () => {
    const none = new Set<string>();
    expect(statusOf(morning!, none, at("07:59"))).toBe("upcoming");
    expect(statusOf(morning!, none, at("08:00"))).toBe("due");
    expect(statusOf(morning!, none, at("09:00"))).toBe("due");
    expect(statusOf(morning!, none, at("09:01"))).toBe("missed");
    expect(statusOf(morning!, new Set([doseKey("m1", morning!.dueAtUtc)]), at("23:00"))).toBe("taken");
  });
  it("honours a custom grace window and rejects negatives", () => {
    expect(statusOf(morning!, new Set(), at("08:10"), 5)).toBe("missed");
    expect(() => statusOf(morning!, new Set(), at("08:10"), -1)).toThrow(RangeError);
  });
  it("is monotonic: once missed, later is still missed (property)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10_000 }), fc.integer({ min: 0, max: 10_000 }), (a, b) => {
        const t1 = Date.parse(morning!.dueAtUtc) + Math.min(a, b) * 60_000;
        const t2 = Date.parse(morning!.dueAtUtc) + Math.max(a, b) * 60_000;
        return statusOf(morning!, new Set(), t1) !== "missed" || statusOf(morning!, new Set(), t2) === "missed";
      }),
    );
  });
});

describe("dayWithStatus", () => {
  it("attaches takenAt and statuses", () => {
    const events: DoseEvent[] = [{ medicineId: "m1", dueAtUtc: morning!.dueAtUtc, takenAtUtc: "2026-10-25T02:35:00.000Z" }];
    const day = dayWithStatus([schedule], events, "2026-10-25", at("21:30"));
    expect(day.map((d) => [d.time, d.status, d.takenAtUtc])).toEqual([
      ["08:00", "taken", "2026-10-25T02:35:00.000Z"],
      ["20:00", "missed", null],
    ]);
  });
});

describe("adherence", () => {
  it("computes per-day counts oldest first", () => {
    const events: DoseEvent[] = [
      { medicineId: "m1", dueAtUtc: morning!.dueAtUtc, takenAtUtc: morning!.dueAtUtc },
      { medicineId: "m1", dueAtUtc: evening!.dueAtUtc, takenAtUtc: evening!.dueAtUtc },
    ];
    const days = adherence([schedule], events, "2026-10-25", 2, at("23:59"));
    expect(days).toEqual([
      { date: "2026-10-24", scheduled: 2, taken: 0, missed: 2 },
      { date: "2026-10-25", scheduled: 2, taken: 2, missed: 0 },
    ]);
    expect(adherencePercent(days)).toBe(50);
  });
  it("returns null percent when nothing is scheduled", () => {
    expect(adherencePercent(adherence([schedule], [], "2026-09-01", 3, at("12:00")))).toBeNull();
  });
  it("rejects invalid day counts", () => {
    expect(() => adherence([schedule], [], "2026-10-25", 0, 0)).toThrow(RangeError);
    expect(() => adherence([schedule], [], "2026-10-25", 1.5, 0)).toThrow(RangeError);
  });
  it("percent is always 0..100 (property)", () => {
    fc.assert(
      fc.property(fc.array(fc.record({ scheduled: fc.integer({ min: 0, max: 10 }), t: fc.nat() })), (rows) => {
        const days = rows.map((r, i) => ({ date: `d${i}`, scheduled: r.scheduled, taken: r.t % (r.scheduled + 1), missed: 0 }));
        const p = adherencePercent(days);
        return p === null || (p >= 0 && p <= 100);
      }),
    );
  });
});

describe("canMarkTaken", () => {
  it("blocks double-marking and very early taps", () => {
    expect(canMarkTaken(morning!, new Set(), at("05:59"))).toBe(false);
    expect(canMarkTaken(morning!, new Set(), at("06:00"))).toBe(true);
    expect(canMarkTaken(morning!, new Set([doseKey("m1", morning!.dueAtUtc)]), at("08:00"))).toBe(false);
  });
});
