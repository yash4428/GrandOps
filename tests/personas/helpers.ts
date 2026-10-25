import { expect, test, type Page } from "@playwright/test";
import type { Violation } from "../../packages/persona-kit/src";

export const PAGES = ["/", "/medicines", "/caregiver", "/report", "/whats-new", "/mission-control"];

export async function setLocale(page: Page, locale: "en" | "hi" | "pa") {
  const url = new URL(test.info().project.use.baseURL ?? "http://127.0.0.1:3100");
  await page.context().addCookies([{ name: "locale", value: locale, domain: url.hostname, path: "/" }]);
}

/** Records violations as a test annotation (read by scripts/persona-report) and fails with a readable message. */
export function expectNoViolations(violations: Violation[]) {
  for (const v of violations) test.info().annotations.push({ type: `violation:${v.rule}`, description: JSON.stringify(v) });
  expect(violations, violations.map((v) => `• ${v.experience} [${v.detail}]`).join("\n")).toEqual([]);
}

export async function attachScreenshot(page: Page, name: string, opts: { blur?: boolean } = {}) {
  if (opts.blur) await page.addStyleTag({ content: "html { filter: blur(1.5px); }" });
  await test.info().attach(name, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  if (opts.blur) await page.addStyleTag({ content: "html { filter: none; }" });
}
