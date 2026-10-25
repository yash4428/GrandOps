import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { chaosDroppedKey } from "../flags";
import { fromAcceptLanguage, isLocale, LOCALE_COOKIE, type Locale } from "./config";

type Messages = Record<string, unknown>;

async function load(locale: Locale): Promise<Messages> {
  return (await import(`../../messages/${locale}.json`)).default as Messages;
}

/** Deletes a dotted key path from a message tree (used only by the staging i18n-leak chaos attack). */
function dropKey(messages: Messages, path: string): Messages {
  const copy = structuredClone(messages);
  const parts = path.split(".");
  let node: Record<string, unknown> | undefined = copy;
  for (const p of parts.slice(0, -1)) node = node?.[p] as Record<string, unknown> | undefined;
  if (node) delete node[parts.at(-1) ?? ""];
  return copy;
}

export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(cookieLocale) ? cookieLocale : fromAcceptLanguage((await headers()).get("accept-language"));
  const en = await load("en");
  let messages = locale === "en" ? en : await load(locale);
  const dropped = await chaosDroppedKey();
  if (dropped && locale !== "en") messages = dropKey(messages, dropped);
  return {
    locale,
    messages,
    timeZone: "Asia/Kolkata",
    // A missing key falls back to English: exactly the leak Rano's persona catches.
    getMessageFallback: ({ namespace, key }) => {
      const path = [namespace, key].filter(Boolean).join(".");
      const value = path.split(".").reduce<unknown>((n, k) => (n as Record<string, unknown> | undefined)?.[k], en);
      return typeof value === "string" ? value : path;
    },
    onError: () => {},
  };
});
