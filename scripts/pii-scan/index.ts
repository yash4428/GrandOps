// pii-scan. Fails if build output, test reports or logs contain PII-like strings.
// Usage: pnpm pii-scan [paths...]   (defaults: reports .next/server build.log)
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { mask, scanText } from "./patterns";

const roots = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const targets = roots.length ? roots : ["reports", ".next/server", "build.log", "test-output.log"];
const TEXT = /\.(log|txt|json|xml|html|js|md)$/;

function* walk(p: string): Generator<string> {
  if (!existsSync(p)) return;
  const st = statSync(p);
  if (st.isFile()) {
    if (TEXT.test(p) && st.size < 5_000_000) yield p;
    return;
  }
  for (const f of readdirSync(p)) yield* walk(join(p, f));
}

let hits = 0;
for (const root of targets) {
  for (const file of walk(root)) {
    for (const h of scanText(readFileSync(file, "utf8"))) {
      hits++;
      if (hits <= 50) console.error(`❌ ${h.name} in ${file}: ${mask(h.match)}`);
    }
  }
}
if (hits) {
  console.error(`pii-scan: ${hits} PII-like strings found. Synthetic data only, and logs must not carry PII.`);
  process.exit(1);
}
console.log(`✅ pii-scan: clean (${targets.join(", ")})`);
