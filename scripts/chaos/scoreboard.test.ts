import { describe, expect, it } from "vitest";
import { scoreboard } from "./scoreboard";

describe("chaos scoreboard", () => {
  it("computes MTTD and MTTR", () => {
    const b = scoreboard([
      { iid: 1, attack: "latency", startedAt: "2026-10-25T10:00:00Z", detectedAt: "2026-10-25T10:04:00Z", recoveredAt: "2026-10-25T10:20:00Z", detected: true },
      { iid: 2, attack: "tiny_buttons", startedAt: "2026-10-25T11:00:00Z", detectedAt: "2026-10-25T11:06:00Z", recoveredAt: null, detected: true },
    ]);
    expect(b).toMatchObject({ rounds: 2, detected: 2, mttdMinutes: 5, mttrMinutes: 20, last: { attack: "tiny_buttons", outcome: "detected" } });
    expect(scoreboard([])).toMatchObject({ rounds: 0, mttdMinutes: null, last: undefined });
  });
});
