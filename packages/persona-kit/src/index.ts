// Reusable, deterministic accessibility checks modelled on elderly users.
// No LLM calls. Each check returns violations; the caller decides pass/fail.
import type { Page } from "@playwright/test";

export interface Violation {
  persona: string;
  rule: string;
  selector: string;
  detail: string;
  /** What the person would experience, in plain language. */
  experience: string;
}

const INTERACTIVE = 'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])';

/** Kamla (hand tremor): every visible interactive target is at least `min` CSS px in both directions. */
export async function checkTargetSize(page: Page, min = 48): Promise<Violation[]> {
  const small = await page.evaluate(
    ({ sel, min }) => {
      const out: { selector: string; w: number; h: number; text: string }[] = [];
      document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
        // Visually hidden inputs are operated via their label, which is measured instead.
        const style = getComputedStyle(el);
        if (style.visibility === "hidden" || style.display === "none" || el.closest(".visually-hidden")) return;
        const target = el instanceof HTMLInputElement && (el.type === "radio" || el.type === "checkbox") && el.labels?.[0] ? el.labels[0] : el;
        const r = target.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return;
        if (el.classList.contains("skip-link")) return;
        if (r.width < min || r.height < min) {
          out.push({ selector: describe(target), w: Math.round(r.width), h: Math.round(r.height), text: (target.textContent ?? "").trim().slice(0, 40) });
        }
      });
      function describe(e: Element): string {
        const id = e.id ? `#${e.id}` : "";
        const testid = e.getAttribute("data-testid");
        return `${e.tagName.toLowerCase()}${id}${testid ? `[data-testid=${testid}]` : ""}${e.className && typeof e.className === "string" ? "." + e.className.split(" ").join(".") : ""}`;
      }
      return out;
    },
    { sel: INTERACTIVE, min },
  );
  return small.map((s) => ({
    persona: "kamla",
    rule: "target-size",
    selector: s.selector,
    detail: `${s.w}×${s.h}px (minimum ${min}×${min}px) "${s.text}"`,
    experience: `Kamla's shaking finger misses "${s.text || s.selector}" because it is only ${s.w}×${s.h}px. Her dose may not get logged.`,
  }));
}

/** Kamla: adjacent targets keep at least `gap` px of space between them. */
export async function checkTargetSpacing(page: Page, gap = 8): Promise<Violation[]> {
  const close = await page.evaluate(
    ({ sel, gap }) => {
      const rects = [...document.querySelectorAll<HTMLElement>(sel)]
        .filter((el) => !el.closest(".visually-hidden") && !el.classList.contains("skip-link"))
        .map((el) => {
          const t = el instanceof HTMLInputElement && el.labels?.[0] ? el.labels[0] : el;
          return { el: t, r: t.getBoundingClientRect() };
        })
        .filter((x) => x.r.width > 0 && x.r.height > 0);
      const out: string[] = [];
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i]!, b = rects[j]!;
          if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
          const dx = Math.max(0, Math.max(a.r.left, b.r.left) - Math.min(a.r.right, b.r.right));
          const dy = Math.max(0, Math.max(a.r.top, b.r.top) - Math.min(a.r.bottom, b.r.bottom));
          if (Math.max(dx, dy) < gap) out.push(`"${(a.el.textContent ?? "").trim().slice(0, 25)}" ↔ "${(b.el.textContent ?? "").trim().slice(0, 25)}" (${Math.round(Math.max(dx, dy))}px)`);
        }
      }
      return out;
    },
    { sel: INTERACTIVE, gap },
  );
  return close.map((c) => ({
    persona: "kamla",
    rule: "target-spacing",
    selector: c,
    detail: `targets closer than ${gap}px`,
    experience: `Kamla could press the wrong one of two buttons that sit too close: ${c}.`,
  }));
}

/** Kamla: 20 taps with random ±jitter px offsets around the centre still land on the target. Seeded, so deterministic. */
export async function checkJitterTap(page: Page, selector: string, jitter = 6, taps = 20, seed = 42): Promise<Violation[]> {
  const misses = await page.evaluate(
    ({ selector, jitter, taps, seed }) => {
      const el = document.querySelector(selector);
      if (!el) return -1;
      el.scrollIntoView({ block: "center" });
      const r = el.getBoundingClientRect();
      let s = seed;
      const rand = () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31) * 2 - 1;
      let miss = 0;
      for (let i = 0; i < taps; i++) {
        const x = r.left + r.width / 2 + rand() * jitter * 2;
        const y = r.top + r.height / 2 + rand() * jitter * 2;
        const hit = document.elementFromPoint(x, y);
        if (!hit || !(hit === el || el.contains(hit))) miss++;
      }
      return miss;
    },
    { selector, jitter, taps, seed },
  );
  if (misses === 0) return [];
  return [
    {
      persona: "kamla",
      rule: "jitter-tap",
      selector,
      detail: misses < 0 ? "target not found" : `${misses}/${taps} jittered taps (±${jitter * 2}px) missed`,
      experience: misses < 0 ? "Kamla cannot find the button at all." : `With a hand tremor, Kamla misses the button ${misses} times out of ${taps}.`,
    },
  ];
}

/** Harbans (low vision): no horizontal scrolling at `width` CSS px (WCAG 1.4.10 reflow). */
export async function checkReflow(page: Page): Promise<Violation[]> {
  const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  if (scroll <= client + 1) return [];
  return [
    {
      persona: "harbans",
      rule: "reflow",
      selector: "html",
      detail: `page is ${scroll}px wide in a ${client}px viewport`,
      experience: "Harbans zooms in to read, and then has to scroll sideways on every line.",
    },
  ];
}

/** Harbans: body text is at least `min` px. */
export async function checkTextSize(page: Page, min = 18): Promise<Violation[]> {
  const small = await page.evaluate((min) => {
    const out: { text: string; size: number }[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walker.nextNode())) {
      const text = (n.textContent ?? "").trim();
      const el = n.parentElement;
      if (!text || !el || el.closest(".visually-hidden, script, style, noscript, [aria-hidden=true]")) continue;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const size = parseFloat(style.fontSize);
      if (size < min) out.push({ text: text.slice(0, 40), size });
    }
    return out;
  }, min);
  return small.slice(0, 10).map((s) => ({
    persona: "harbans",
    rule: "text-size",
    selector: `"${s.text}"`,
    detail: `${s.size}px (minimum ${min}px)`,
    experience: `Harbans cannot read "${s.text}" because the text is only ${s.size}px.`,
  }));
}

/** Harbans: key text (headings, buttons, dose names) has contrast ≥ `ratio` (AAA = 7). */
export async function checkContrast(page: Page, selector = "h1, h2, .dose-name, .dose-time, .btn, .status-pill, .notice", ratio = 7): Promise<Violation[]> {
  const low = await page.evaluate(
    ({ selector, ratio }) => {
      const parse = (c: string) => {
        const m = c.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 1];
        return { r: m[0] ?? 0, g: m[1] ?? 0, b: m[2] ?? 0, a: m[3] ?? 1 };
      };
      const lum = ({ r, g, b }: { r: number; g: number; b: number }) => {
        const f = (v: number) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const bgOf = (el: Element | null): { r: number; g: number; b: number } => {
        while (el) {
          const c = parse(getComputedStyle(el).backgroundColor);
          if (c.a > 0.5) return c;
          el = el.parentElement;
        }
        return { r: 255, g: 255, b: 255 };
      };
      const out: { text: string; ratio: number }[] = [];
      document.querySelectorAll(selector).forEach((el) => {
        const fg = parse(getComputedStyle(el).color);
        const l1 = lum(fg), l2 = lum(bgOf(el));
        const cr = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        if (cr < ratio) out.push({ text: (el.textContent ?? "").trim().slice(0, 40), ratio: Math.round(cr * 100) / 100 });
      });
      return out;
    },
    { selector, ratio },
  );
  return low.map((l) => ({
    persona: "harbans",
    rule: "contrast-aaa",
    selector: `"${l.text}"`,
    detail: `contrast ${l.ratio}:1 (minimum ${ratio}:1)`,
    experience: `"${l.text}" is too faint for Harbans to read.`,
  }));
}

function flatten(obj: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) Object.assign(out, flatten(v, prefix ? `${prefix}.${k}` : k));
  } else if (typeof obj === "string") out[prefix] = obj;
  return out;
}

/** Rano: every key in the base catalog exists (non-empty) in the target catalog. */
export function missingKeys(base: unknown, target: unknown): string[] {
  const b = flatten(base), t = flatten(target);
  return Object.keys(b).filter((k) => !t[k]);
}

/** Literal parts of an ICU message, e.g. "Taken at {time}" → ["Taken at"]. */
function literalParts(msg: string): string[] {
  return msg
    .replace(/\{[^{}]*(\{[^{}]*\}[^{}]*)*\}/g, "\u0000")
    .split("\u0000")
    .map((s) => s.trim())
    .filter((s) => s.length >= 4 && /[a-z]{3}/i.test(s));
}

/** Rano: no English catalog text appears on a page rendered in `targetCatalog`'s language. */
export async function checkNoEnglishLeak(page: Page, enCatalog: unknown, targetCatalog: unknown): Promise<Violation[]> {
  const en = flatten(enCatalog), target = flatten(targetCatalog);
  const needles = [...new Set(Object.entries(en).filter(([k, v]) => target[k] !== v).flatMap(([, v]) => literalParts(v)))];
  const texts = await page.evaluate(() => {
    const out: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walker.nextNode())) {
      const el = n.parentElement;
      const t = (n.textContent ?? "").trim();
      if (!t || !el || el.closest('script, style, [lang="en"], [translate="no"]')) continue;
      out.push(t);
    }
    document.querySelectorAll("[aria-label]").forEach((e) => out.push(e.getAttribute("aria-label") ?? ""));
    return out;
  });
  const leaks = [...new Set(texts.filter((t) => needles.some((n) => t.includes(n))))];
  return leaks.map((t) => ({
    persona: "rano",
    rule: "english-leak",
    selector: `"${t.slice(0, 50)}"`,
    detail: "English text on a Punjabi page",
    experience: `Rano reads only Punjabi. She sees "${t.slice(0, 50)}" and cannot understand it.`,
  }));
}

/** Rano: a webfont covering the script actually loaded (no tofu boxes). */
export async function checkScriptFont(page: Page, sample: string, familyHint: RegExp): Promise<Violation[]> {
  const ok = await page.evaluate(
    async ({ sample, hint }) => {
      await document.fonts.ready;
      const re = new RegExp(hint, "i");
      const families = [...document.fonts].filter((f) => re.test(f.family)).map((f) => f.family);
      if (families.length === 0) return false;
      return families.some((fam) => document.fonts.check(`20px "${fam}"`, sample));
    },
    { sample, hint: familyHint.source },
  );
  if (ok) return [];
  return [
    {
      persona: "rano",
      rule: "script-font",
      selector: "body",
      detail: `no loaded font for ${familyHint.source}`,
      experience: "Rano would see empty boxes instead of Punjabi letters.",
    },
  ];
}
