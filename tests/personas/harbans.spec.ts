// Harbans, 72: low vision. 320px reflow (≈ 200%+ zoom), large text, AAA contrast.
import { test } from "@playwright/test";
import { checkContrast, checkReflow, checkTextSize } from "../../packages/persona-kit/src";
import { attachScreenshot, expectNoViolations, PAGES } from "./helpers";

test.describe("persona:harbans", () => {
  for (const path of PAGES) {
    test(`readable at 320px on ${path}`, async ({ page }) => {
      await page.goto(path);
      const v = [...(await checkReflow(page)), ...(await checkTextSize(page)), ...(await checkContrast(page))];
      await attachScreenshot(page, `harbans-blur${path.replace(/\//g, "_")}`, { blur: true });
      expectNoViolations(v);
    });
  }

  test("dose status is not shown by colour alone", async ({ page }) => {
    await page.goto("/");
    const unlabeled = await page.$$eval('[data-status="missed"], [data-status="taken"]', (cards) =>
      cards.filter((c) => !c.querySelector(".status-pill")).length,
    );
    expectNoViolations(
      unlabeled
        ? [{ persona: "harbans", rule: "colour-only", selector: ".dose-card", detail: `${unlabeled} cards`, experience: "Harbans cannot tell a missed dose from a taken one: only the colour differs." }]
        : [],
    );
  });
});
