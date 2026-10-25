import type { Locale } from "./i18n/config";

/**
 * Herald writes each GitLab Release description with language blocks:
 *   <!-- notes:en --> ... <!-- /notes:en -->
 * This pulls the caregiver note for one language. Pure.
 */
export function notesFor(description: string, locale: Locale): string | null {
  const re = new RegExp(`<!--\\s*notes:${locale}\\s*-->([\\s\\S]*?)<!--\\s*/notes:${locale}\\s*-->`);
  const m = re.exec(description);
  const text = m?.[1]?.trim();
  return text ? text : null;
}
