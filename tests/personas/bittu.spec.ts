// Bittu's ₹6,000 Android phone on a slow 3G connection.
import { expect, test } from "@playwright/test";
import { expectNoViolations } from "./helpers";

const LCP_BUDGET_MS = 3000;
const JS_BUDGET_KB = 170;
const PAGE_BUDGET_KB = 600;
const THREE_G_RTT_MS = 400;

/** Real round trip from this test runner to the server (median of 5). On a local server it is ~0. */
async function measuredRttMs(request: import("@playwright/test").APIRequestContext): Promise<number> {
  const times: number[] = [];
  for (let i = 0; i < 5; i++) {
    const t0 = Date.now();
    await request.get("/health");
    times.push(Date.now() - t0);
  }
  return times.sort((a, b) => a - b)[2]!;
}

test.describe("persona:bittu", () => {
  test("Today loads fast on a slow phone and network", async ({ page, browserName, request }) => {
    test.skip(browserName !== "chromium", "CDP throttling needs Chromium");
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.enable");
    // Bittu's phone sees 400ms per round trip in total. A runner far from the server already pays part of
    // that (e.g. US runner to Mumbai), so only the remainder is emulated. The LCP budget never changes.
    const rtt = await measuredRttMs(request);
    const latency = Math.max(0, THREE_G_RTT_MS - rtt);
    test.info().annotations.push({ type: "network", description: JSON.stringify({ measuredRttMs: rtt, emulatedLatencyMs: latency }) });
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

    await page.goto("/", { waitUntil: "load" });
    const lcp = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            resolve(entries[entries.length - 1]!.startTime);
          }).observe({ type: "largest-contentful-paint", buffered: true });
          setTimeout(() => resolve(-1), 5000);
        }),
    );
    const { jsKb, totalKb } = await page.evaluate(() => {
      const res = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceResourceTiming;
      const js = res.filter((r) => r.initiatorType === "script" || r.name.endsWith(".js")).reduce((n, r) => n + r.transferSize, 0);
      const total = res.reduce((n, r) => n + r.transferSize, 0) + (nav?.transferSize ?? 0);
      return { jsKb: Math.round(js / 1024), totalKb: Math.round(total / 1024) };
    });
    test.info().annotations.push({ type: "metric", description: JSON.stringify({ lcpMs: Math.round(lcp), jsKb, totalKb }) });

    expect(lcp, "LCP was not measured").toBeGreaterThan(0);
    const v = [];
    if (lcp > LCP_BUDGET_MS) v.push({ persona: "bittu", rule: "lcp", selector: "/", detail: `LCP ${Math.round(lcp)}ms (budget ${LCP_BUDGET_MS}ms)`, experience: `Bittu waits ${(lcp / 1000).toFixed(1)}s to see today's medicines.` });
    if (jsKb > JS_BUDGET_KB) v.push({ persona: "bittu", rule: "js-budget", selector: "/", detail: `${jsKb}KB JS (budget ${JS_BUDGET_KB}KB)`, experience: `Bittu's phone downloads ${jsKb}KB of code before it works.` });
    if (totalKb > PAGE_BUDGET_KB) v.push({ persona: "bittu", rule: "page-weight", selector: "/", detail: `${totalKb}KB total (budget ${PAGE_BUDGET_KB}KB)`, experience: `The page costs Bittu ${totalKb}KB of mobile data.` });
    expectNoViolations(v);
  });
});
