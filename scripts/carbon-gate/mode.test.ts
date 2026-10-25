import { describe, expect, it } from "vitest";
import { loadPolicy } from "../lib/policy";
import { carbonMode } from "./mode";

const p = loadPolicy();
describe("carbonMode", () => {
  it("steps through full, lite, defer", () => {
    expect(carbonMode(p, 0, [], null).mode).toBe("full");
    expect(carbonMode(p, 1600, [], null).mode).toBe("lite");
    expect(carbonMode(p, 1950, [], null).mode).toBe("defer");
  });
  it("never reduces medication-critical or tier 2", () => {
    expect(carbonMode(p, 1950, ["medication-critical"], null).mode).toBe("full");
    expect(carbonMode(p, 1950, [], "2").mode).toBe("full");
  });
});
