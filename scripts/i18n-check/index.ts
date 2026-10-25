// i18n-check. Every key in en exists in hi and pa, and hi/pa values are not left in English.
import { readFileSync } from "node:fs";

type Tree = Record<string, unknown>;
const load = (l: string) => JSON.parse(readFileSync(`messages/${l}.json`, "utf8")) as Tree;
const flat = (o: unknown, p = ""): Record<string, string> =>
  o && typeof o === "object"
    ? Object.assign({}, ...Object.entries(o).map(([k, v]) => flat(v, p ? `${p}.${k}` : k)))
    : { [p]: String(o) };

// Values that are legitimately identical in every language.
const SAME_OK = new Set(["language.en", "language.hi", "language.pa", "today.date", "caregiver.percent"]);

const en = flat(load("en"));
let problems = 0;
for (const l of ["hi", "pa"]) {
  const t = flat(load(l));
  for (const k of Object.keys(en)) {
    if (!t[k]) {
      console.error(`❌ ${l}: missing ${k}`);
      problems++;
    } else if (t[k] === en[k] && !SAME_OK.has(k) && /[a-z]{3}/i.test(en[k]!.replace(/\{[^}]*\}/g, ""))) {
      console.error(`❌ ${l}: ${k} is still English: "${t[k]}"`);
      problems++;
    }
  }
  for (const k of Object.keys(t)) if (!(k in en)) console.warn(`⚠ ${l}: extra key ${k}`);
}
if (problems) process.exit(1);
console.log(`✅ i18n-check: ${Object.keys(en).length} keys present in en, hi, pa`);
