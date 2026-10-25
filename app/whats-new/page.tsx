import { getLocale, getTranslations } from "next-intl/server";
import { gl } from "@/lib/gitlab/client";
import type { Locale } from "@/lib/i18n/config";
import { notesFor } from "@/lib/release-notes";

export const dynamic = "force-dynamic";

interface Release {
  tag_name: string;
  description: string;
  released_at: string;
  assets?: { links?: { name: string; url: string }[] };
}

export default async function WhatsNewPage() {
  const t = await getTranslations("whatsNew");
  const locale = (await getLocale()) as Locale;
  const releases = (await gl<Release[]>("/releases?per_page=5", 60_000)) ?? [];
  const items = releases
    .map((r) => ({ r, note: notesFor(r.description ?? "", locale), audio: r.assets?.links?.find((l) => l.name === `notes-${locale}.mp3`)?.url }))
    .filter((x) => x.note);
  return (
    <>
      <h1>{t("title")}</h1>
      {items.length === 0 && <p>{t("empty")}</p>}
      {items.map(({ r, note, audio }) => (
        <article key={r.tag_name} className="card">
          <h2>{t("version", { version: r.tag_name })}</h2>
          {note!.split("\n").filter(Boolean).map((line, i) => (
            <p key={i}>{line.replace(/^[-*]\s*/, "")}</p>
          ))}
          {audio && (
            <audio controls preload="none" src={audio} aria-label={t("play")}>
              <track kind="captions" />
            </audio>
          )}
        </article>
      ))}
    </>
  );
}
