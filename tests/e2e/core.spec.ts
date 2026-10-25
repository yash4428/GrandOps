import { expect, test } from "@playwright/test";

test.describe("core flows @e2e", () => {
  test("healthz is ok", async ({ request }) => {
    const res = await request.get("/healthz");
    expect(res.status()).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  test("mark a dose taken shows a confirmation tick", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Today's medicines");
    const before = await page.getByTestId("dose-taken").count();
    await page.getByTestId("dose-taken").first().click();
    await expect(page.locator("#done")).toContainText("Saved");
    await expect(page.getByTestId("dose-taken")).toHaveCount(before - 1);
  });

  test("switching language to Hindi translates the page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "हिन्दी" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("आज की दवाइयाँ");
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  });

  test("add a medicine", async ({ page }) => {
    await page.goto("/medicines");
    await page.getByLabel("Medicine name").fill("Test syrup");
    await page.getByLabel("Time", { exact: true }).fill("18:00");
    await page.getByRole("button", { name: "Save medicine" }).click();
    await expect(page.getByRole("status")).toContainText("Medicine saved");
    await expect(page.getByText("Test syrup")).toBeVisible();
  });

  test("caregiver sees adherence", async ({ page }) => {
    await page.goto("/caregiver");
    await expect(page.getByRole("heading", { name: "Medicines taken" })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("report a problem from the Something's wrong button", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("report-button").click();
    await page.getByText("Button is hard to press").click();
    await page.getByLabel("Tell us in your words (optional)").fill("The button is too small");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Thank you" })).toBeVisible();
  });
});
