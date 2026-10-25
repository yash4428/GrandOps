export const locales = ["en", "hi", "pa"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "locale";

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (locales as readonly string[]).includes(v);
}

/** Picks the best supported locale from an Accept-Language header. */
export function fromAcceptLanguage(header: string | null): Locale {
  if (!header) return defaultLocale;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag = "", q] = part.trim().split(";q=");
      return { lang: tag.toLowerCase().split("-")[0] ?? "", q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  return ranked.map((r) => r.lang).find(isLocale) ?? defaultLocale;
}

/** BCP 47 tag used for Intl formatting and the html lang attribute. */
export function intlTag(locale: Locale): string {
  return `${locale}-IN`;
}
