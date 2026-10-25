import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  addDays,
  dosesForDate,
  dosesForDay,
  formatIstTime,
  isActiveOn,
  istToUtcMs,
  parseIstDate,
  parseTimeOfDay,
  utcMsToIstDate,
  utcMsToIstTime,
  type Schedule,
} from "@/lib/schedule";

const base: Schedule = { medicineId: "m1", times: ["20:00", "08:00"], startDate: "2026-10-01", endDate: null };

describe("parsing", () => {
  it("parses valid times and dates", () => {
    expect(parseTimeOfDay("08:05")).toEqual({ hours: 8, minutes: 5 });
    expect(parseIstDate("2026-02-28")).toEqual({ year: 2026, month: 2, day: 28 });
  });
  it.each(["8:00", "24:00", "12:60", "", "ab:cd"])("rejects time %s", (t) => {
    expect(() => parseTimeOfDay(t)).toThrow(RangeError);
  });
  it.each(["2026-02-30", "2026-13-01", "26-01-01", "2026-00-10"])("rejects date %s", (d) => {
    expect(() => parseIstDate(d)).toThrow(RangeError);
  });
  it("rejects a day that overflows into the next month", () => {
    expect(() => parseIstDate("2026-04-31")).toThrow(RangeError);
  });
});

describe("IST <-> UTC", () => {
  it("08:00 IST is 02:30 UTC", () => {
    expect(new Date(istToUtcMs("2026-10-25", "08:00")).toISOString()).toBe("2026-10-25T02:30:00.000Z");
  });
  it("00:15 IST belongs to the IST date even though UTC is the previous day", () => {
    const ms = istToUtcMs("2026-10-25", "00:15");
    expect(new Date(ms).toISOString()).toBe("2026-10-24T18:45:00.000Z");
    expect(utcMsToIstDate(ms)).toBe("2026-10-25");
    expect(utcMsToIstTime(ms)).toBe("00:15");
  });
  it("formats ISO timestamps in IST and rejects garbage", () => {
    expect(formatIstTime("2026-10-25T14:30:00.000Z")).toBe("20:00");
    expect(() => formatIstTime("not-a-date")).toThrow(RangeError);
  });
  it("round-trips any valid IST date/time (property)", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date("2000-01-01T00:00:00Z"), max: new Date("2099-12-31T00:00:00Z"), noInvalidDate: true }),
        fc.integer({ min: 0, max: 23 }),
        fc.integer({ min: 0, max: 59 }),
        (d, h, m) => {
          const date = d.toISOString().slice(0, 10);
          const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
          const ms = istToUtcMs(date, time);
          return utcMsToIstDate(ms) === date && utcMsToIstTime(ms) === time;
        },
      ),
    );
  });
});

describe("addDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
  });
  it("is invertible (property)", () => {
    fc.assert(
      fc.property(fc.integer({ min: -2000, max: 2000 }), (n) => addDays(addDays("2026-06-15", n), -n) === "2026-06-15"),
    );
  });
});

describe("schedules", () => {
  it("respects start and end dates", () => {
    const s = { ...base, endDate: "2026-10-10" };
    expect(isActiveOn(s, "2026-09-30")).toBe(false);
    expect(isActiveOn(s, "2026-10-01")).toBe(true);
    expect(isActiveOn(s, "2026-10-10")).toBe(true);
    expect(isActiveOn(s, "2026-10-11")).toBe(false);
    expect(dosesForDate(s, "2026-10-11")).toEqual([]);
  });
  it("sorts and dedupes times", () => {
    const s = { ...base, times: ["20:00", "08:00", "08:00"] };
    expect(dosesForDate(s, "2026-10-25").map((d) => d.time)).toEqual(["08:00", "20:00"]);
  });
  it("orders a day across medicines by due time then medicine id", () => {
    const day = dosesForDay(
      [
        { ...base, medicineId: "b", times: ["08:00"] },
        { ...base, medicineId: "a", times: ["08:00", "07:00"] },
        { ...base, medicineId: "c", times: ["06:00"] },
      ],
      "2026-10-25",
    );
    expect(day.map((d) => `${d.medicineId}-${d.time}`)).toEqual(["c-06:00", "a-07:00", "a-08:00", "b-08:00"]);
  });
  it("every dose of a day falls on that IST date (property)", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: 0, max: 1439 }), { minLength: 1, maxLength: 6 }),
        fc.integer({ min: 0, max: 400 }),
        (mins, offset) => {
          const times = mins.map((m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
          const date = addDays("2026-01-01", offset);
          const doses = dosesForDate({ ...base, times, startDate: "2026-01-01" }, date);
          return doses.length === times.length && doses.every((d) => utcMsToIstDate(Date.parse(d.dueAtUtc)) === date);
        },
      ),
    );
  });
});
