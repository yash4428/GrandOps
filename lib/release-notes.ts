import type { Locale } from "./i18n/config";

/**
 * Herald writes each GitLab Release description with language blocks:
 *   <!-- notes:en --> ... <!-- /notes:en -->   (or [notes:en] ... [/notes:en] from the Herald flow)
 * This pulls the caregiver note for one language. Pure.
 */
export function notesFor(description: string, locale: Locale): string | null {
  const open = `(?:<!--\\s*notes:${locale}\\s*-->|\\[notes:${locale}\\])`;
  const close = `(?:<!--\\s*/notes:${locale}\\s*-->|\\[/notes:${locale}\\])`;
  const re = new RegExp(`${open}([\\s\\S]*?)${close}`);
  const m = re.exec(description);
  const text = m?.[1]?.trim();
  return text ? text : null;
}
