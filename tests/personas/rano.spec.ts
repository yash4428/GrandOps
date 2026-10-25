// Rano, 70: reads only Punjabi (Gurmukhi).
import { expect, test } from "@playwright/test";
import en from "../../messages/en.json" with { type: "json" };
import hi from "../../messages/hi.json" with { type: "json" };
import pa from "../../messages/pa.json" with { type: "json" };
import { checkNoEnglishLeak, checkScriptFont, missingKeys } from "../../packages/persona-kit/src";
import { attachScreenshot, expectNoViolations, PAGES, setLocale } from "./helpers";

test.describe("persona:rano", () => {
  test("every key exists in pa and hi", () => {
    expect(missingKeys(en, pa), "missing in pa.json").toEqual([]);
    expect(missingKeys(en, hi), "missing in hi.json").toEqual([]);
  });

  for (const path of PAGES) {
    test(`no English on the Punjabi ${path}`, async ({ page }) => {
      await setLocale(page, "pa");
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("lang", "pa");
      const v = [...(await checkNoEnglishLeak(page, en, pa)), ...(await checkScriptFont(page, "ਦਵਾਈ", /Gurmukhi/))];
      if (v.length) await attachScreenshot(page, `rano${path.replace(/\//g, "_")}`);
      expectNoViolations(v);
    });
  }
});
