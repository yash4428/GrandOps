import { getLocale, getTranslations } from "next-intl/server";
import { setLocale } from "@/app/actions";
import { locales } from "@/lib/i18n/config";

export async function LanguageSwitcher() {
  const t = await getTranslations("language");
  const current = await getLocale();
  return (
    <form action={setLocale} className="lang-form">
      <fieldset>
        <legend className="visually-hidden">{t("label")}</legend>
        {locales.map((l) => (
          <button key={l} type="submit" name="locale" value={l} className="lang-btn" aria-pressed={l === current} lang={l}>
            {t(l)}
          </button>
        ))}
      </fieldset>
    </form>
  );
}
