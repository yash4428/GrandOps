import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cloudRunFootprint, footprint, jobsFootprint, llmRangeG, percentLess, type Coefficients } from "./model";

const c = JSON.parse(readFileSync("scripts/sci/coefficients.json", "utf8")) as Coefficients;

describe("SCI model", () => {
  it("computes one vCPU-hour by hand", () => {
    const f = footprint(c, 1, 0, 1, "us-east1");
    const watts = 0.71 + 0.5 * (4.26 - 0.71);
    expect(f.energyKwh).toBeCloseTo((watts / 1000) * 1.1, 9);
    expect(f.operationalG).toBeCloseTo(f.energyKwh * 560, 9);
    expect(f.embodiedG).toBeCloseTo((1200 * 1000 * (1 / (4 * 8760))) / 64, 9);
  });
  it("scales linearly with job duration", () => {
    const a = jobsFootprint(c, [{ name: "a", durationS: 600, runnerType: "saas-linux-small-amd64" }]);
    const b = jobsFootprint(c, [{ name: "a", durationS: 1200, runnerType: "saas-linux-small-amd64" }]);
    expect(b.totalG).toBeCloseTo(a.totalG * 2, 9);
  });
  it("falls back to the default runner and rejects unknown regions", () => {
    expect(jobsFootprint(c, [{ name: "x", durationS: 60, runnerType: "mystery" }]).totalG).toBeGreaterThan(0);
    expect(() => footprint(c, 1, 1, 1, "mars-1")).toThrow();
  });
  it("cloud run, llm range and percent", () => {
    expect(cloudRunFootprint(c, 3600).totalG).toBeGreaterThan(0);
    const r = llmRangeG(c, 10, "us-east1");
    expect(r.highG).toBeGreaterThan(r.lowG);
    expect(percentLess(59, 100)).toBe(41);
    expect(percentLess(1, 0)).toBeNull();
  });
});
