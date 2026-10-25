import { describe, expect, it } from "vitest";
import { cards, renderComment, type PwReport } from "./render";

const report: PwReport = {
  suites: [
    {
      title: "kamla.spec.ts",
      suites: [
        {
          title: "persona:kamla",
          specs: [
            {
              title: "targets",
              tests: [
                {
                  projectName: "kamla",
                  results: [{ status: "failed" }],
                  annotations: [{ type: "violation:target-size", description: JSON.stringify({ experience: "Kamla misses it" }) }],
                },
              ],
            },
            { title: "jitter", tests: [{ projectName: "kamla", results: [{ status: "passed" }] }] },
            { title: "rano", tests: [{ projectName: "rano", results: [{ status: "failed", errors: [{ message: "boom\nstack" }] }] }] },
            { title: "e2e", tests: [{ projectName: "e2e", results: [{ status: "passed" }] }] },
          ],
        },
      ],
    },
  ],
};

describe("persona report", () => {
  it("builds cards per persona", () => {
    const cs = cards(report);
    expect(cs.map((c) => [c.persona, c.passed, c.failed])).toEqual([
      ["kamla", 1, 1],
      ["rano", 0, 1],
    ]);
    const md = renderComment(cs, "https://x/job");
    expect(md).toContain("❌ Kamla, 78");
    expect(md).toContain("> Kamla misses it");
    expect(md).toContain("rano: boom");
  });
});
