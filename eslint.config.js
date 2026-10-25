import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: [".next/**", "node_modules/**", "playwright-report/**", "test-results/**", "coverage/**", "next-env.d.ts", "packages/*/dist/**", "reports/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": ["error", { allow: ["error", "warn"] }],
    },
  },
  {
    files: ["scripts/**", "tests/**", "packages/**"],
    rules: { "no-console": "off" },
  },
);
