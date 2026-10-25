// Kamla, 78: hand tremor. Imprecise taps.
import { test } from "@playwright/test";
import { checkJitterTap, checkTargetSize, checkTargetSpacing } from "../../packages/persona-kit/src";
import { attachScreenshot, expectNoViolations, PAGES } from "./helpers";

test.describe("persona:kamla", () => {
  for (const path of PAGES) {
    test(`targets are at least 48px on ${path}`, async ({ page }) => {
      await page.goto(path);
      const v = [...(await checkTargetSize(page)), ...(await checkTargetSpacing(page))];
      if (v.length) await attachScreenshot(page, `kamla${path.replace(/\//g, "_")}`);
      expectNoViolations(v);
    });
  }

  test("jittery taps still hit 'Dose taken'", async ({ page }) => {
    await page.goto("/");
    const v = await checkJitterTap(page, '[data-testid="dose-taken"]');
    if (v.length) await attachScreenshot(page, "kamla_jitter");
    expectNoViolations(v);
  });

  test("jittery taps still hit 'Something's wrong'", async ({ page }) => {
    await page.goto("/");
    expectNoViolations(await checkJitterTap(page, '[data-testid="report-button"]'));
  });
});
