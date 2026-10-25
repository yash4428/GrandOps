// Pure PII patterns for logs and build output (synthetic-data project: any hit is a bug).
export const PATTERNS: { name: string; re: RegExp }[] = [
  { name: "indian-mobile", re: /(?<![\w.+-])(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?![\w.])/g },
  { name: "aadhaar-like", re: /(?<![\w-])\d{4}[\s-]\d{4}[\s-]\d{4}(?![\w-])/g },
  { name: "email", re: /[A-Za-z0-9._%+-]+@(?!example\.(?:com|org)|users\.noreply|noreply)[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
];

export function scanText(text: string): { name: string; match: string }[] {
  return PATTERNS.flatMap((p) => [...text.matchAll(p.re)].map((m) => ({ name: p.name, match: m[0] })));
}

export function mask(s: string): string {
  return s.length <= 4 ? "****" : `${s.slice(0, 2)}${"*".repeat(s.length - 4)}${s.slice(-2)}`;
}
