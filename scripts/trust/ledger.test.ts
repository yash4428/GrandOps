import { describe, expect, it } from "vitest";
import { loadPolicy } from "../lib/policy";
import { EMPTY, recordMerge, recordRollback, settle } from "./ledger";

const p = loadPolicy();
describe("trust ledger", () => {
  it("credits only after 24h and is idempotent", () => {
    let l = recordMerge(EMPTY, 7, "builder", "1", "2026-10-25T00:00:00Z");
    l = recordMerge(l, 7, "builder", "1", "2026-10-25T00:00:00Z");
    expect(settle(p, l, "2026-10-25T12:00:00Z").pending).toHaveLength(1);
    l = settle(p, l, "2026-10-26T00:00:01Z");
    expect(l.agents.builder!["1"]).toBe(55);
    expect(l.pending).toHaveLength(0);
  });
  it("rollback costs 25 and cancels the pending credit, floored at 0", () => {
    let l = recordMerge(EMPTY, 8, "healer", "2", "2026-10-25T00:00:00Z");
    l = recordRollback(p, l, 8, "healer", "2", "2026-10-25T01:00:00Z");
    expect(l.agents.healer!["2"]).toBe(25);
    expect(l.pending).toHaveLength(0);
    l = recordRollback(p, recordRollback(p, l, 9, "healer", "2", "x"), 10, "healer", "2", "x");
    expect(l.agents.healer!["2"]).toBe(0);
  });
});
