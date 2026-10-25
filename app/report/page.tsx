import { getLocale, getTranslations } from "next-intl/server";
import { ReportForm } from "@/components/ReportForm";

export default async function ReportPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const t = await getTranslations("report");
  const locale = await getLocale();
  const from = (await searchParams).from ?? "/";
  return (
    <>
      <h1>{t("title")}</h1>
      <p className="lead">{t("intro")}</p>
      <ReportForm
        locale={locale}
        from={from}
        s={{
          reasons: t("reasons"),
          options: {
            cantPress: t("cantPress"),
            cantRead: t("cantRead"),
            wrongLanguage: t("wrongLanguage"),
            slow: t("slow"),
            wrongTime: t("wrongTime"),
            other: t("other"),
          },
          textLabel: t("textLabel"),
          record: t("record"),
          stop: t("stop"),
          recording: t("recording"),
          recorded: t("recorded"),
          noMic: t("noMic"),
          send: t("send"),
          sending: t("sending"),
          thanks: t("thanks"),
          thanksDetail: t.raw("thanksDetail") as string,
          error: t("error"),
          back: t("back"),
          privacy: t("privacy"),
        }}
      />
    </>
  );
}
