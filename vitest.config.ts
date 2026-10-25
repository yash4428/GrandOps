import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: {
    include: ["tests/unit/**/*.test.ts", "scripts/**/*.test.ts", "packages/**/*.test.ts"],
    environment: "node",
    reporters: process.env.CI ? ["default", "junit"] : ["default"],
    outputFile: { junit: "reports/junit-unit.xml" },
    coverage: {
      provider: "v8",
      include: ["lib/schedule/**", "lib/doses/**"],
      thresholds: {
        "lib/schedule/**": { branches: 100, functions: 100, lines: 100, statements: 100 },
        "lib/doses/**": { branches: 100, functions: 100, lines: 100, statements: 100 },
      },
      reporter: ["text", "cobertura"],
      reportsDirectory: "coverage",
    },
  },
});
