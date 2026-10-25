import { describe, expect, it } from "vitest";
import { chaosViolations } from "./check";

describe("chaos guard", () => {
  it("allows chaos on staging only", () => {
    expect(chaosViolations({ CHAOS_LATENCY_MS: "4000" }, "staging", ["staging"])).toEqual([]);
    expect(chaosViolations({ CHAOS_LATENCY_MS: "4000", OTHER: "1" }, "production", ["staging"])).toEqual(["CHAOS_LATENCY_MS"]);
    expect(chaosViolations({ CHAOS_TINY_BUTTONS: "0" }, "production", ["staging"])).toEqual([]);
    expect(chaosViolations({}, "production", ["staging"], ["chaos_tiny_buttons", "new_ui"])).toEqual(["feature flag chaos_tiny_buttons"]);
  });
});
