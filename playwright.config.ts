import { defineConfig, devices } from "@playwright/test";

const external = process.env.BASE_URL; // set by verify-live jobs to the staging/prod URL
const port = 3100;

export default defineConfig({
  testDir: "tests",
  testMatch: ["e2e/**/*.spec.ts", "personas/**/*.spec.ts"],
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  // Commit author emails would land in the JSON report and trip the PII scan.
  captureGitInfo: { commit: false, diff: false },
  reporter: [
    ["list"],
    ["junit", { outputFile: process.env.JUNIT_FILE ?? "reports/junit-playwright.xml" }],
    ["json", { outputFile: process.env.PERSONA_JSON ?? "reports/playwright.json" }],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL: external ?? `http://127.0.0.1:${port}`,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    ...devices["Pixel 7"],
  },
  projects: [
    { name: "e2e", testMatch: "e2e/**/*.spec.ts" },
    { name: "kamla", testMatch: "personas/kamla.spec.ts" },
    { name: "harbans", testMatch: "personas/harbans.spec.ts", use: { viewport: { width: 320, height: 640 }, deviceScaleFactor: 2 } },
    { name: "rano", testMatch: "personas/rano.spec.ts", use: { locale: "pa-IN" } },
    { name: "mohan", testMatch: "personas/mohan.spec.ts" },
    { name: "bittu", testMatch: "personas/bittu.spec.ts" },
  ],
  webServer: external
    ? undefined
    : {
        command: `pnpm start --port ${port}`,
        url: `http://127.0.0.1:${port}/healthz`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: { DEMO_NOW: "2026-10-25T09:30:00+05:30", APP_ENV: "ci", DATA_BACKEND: process.env.DATA_BACKEND ?? "memory" },
      },
});
