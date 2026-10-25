import { describe, expect, it } from "vitest";
import { evaluate, p95 } from "./slo";

describe("canary SLO", () => {
  it("p95", () => {
    expect(p95([])).toBe(0);
    expect(p95(Array.from({ length: 100 }, (_, i) => i + 1))).toBe(95);
  });
  it("passes and fails", () => {
    const good = Array.from({ length: 100 }, () => ({ ok: true, ms: 200 }));
    expect(evaluate(good, 0.01, 1500).pass).toBe(true);
    const slow = good.map((p, i) => (i < 10 ? { ok: true, ms: 4000 } : p));
    expect(evaluate(slow, 0.01, 1500)).toMatchObject({ pass: false, reason: "p95 4000ms > 1500ms" });
    const errs = good.map((p, i) => (i < 2 ? { ok: false, ms: 100 } : p));
    expect(evaluate(errs, 0.01, 1500).pass).toBe(false);
    expect(evaluate([], 0.01, 1500).pass).toBe(false);
  });
});
