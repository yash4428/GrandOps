// Mohan, 81: blind, uses a screen reader and keyboard.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectNoViolations, PAGES } from "./helpers";

test.describe("persona:mohan", () => {
  for (const path of PAGES) {
    test(`axe: no serious or critical issues on ${path}`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expectNoViolations(
        bad.map((v) => ({
          persona: "mohan",
          rule: `axe:${v.id}`,
          selector: v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", "),
          detail: v.help,
          experience: `Mohan's screen reader stumbles here: ${v.help}.`,
        })),
      );
    });
  }

  test("can mark a dose taken with the keyboard only", async ({ page }) => {
    await page.goto("/");
    let found = false;
    for (let i = 0; i < 40 && !found; i++) {
      await page.keyboard.press("Tab");
      found = await page.evaluate(() => document.activeElement?.getAttribute("data-testid") === "dose-taken");
    }
    expect(found, "Mohan could not reach a 'Dose taken' button with Tab").toBe(true);
    await page.keyboard.press("Enter");
    await expect(page.locator("#done")).toBeVisible();
  });

  test("skip link moves focus to main content", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.locator(".skip-link")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
  });
});
