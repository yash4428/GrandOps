/** Removes things that look like PII before a report leaves the app. Pure. */
export function redact(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
    .replace(/(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/g, "[phone]")
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[id]")
    .replace(/\b\d{7,}\b/g, "[number]")
    .slice(0, 2000);
}
