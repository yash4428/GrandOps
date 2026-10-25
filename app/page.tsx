import { getLocale, getTranslations } from "next-intl/server";
import { DoseCard } from "@/components/DoseCard";
import { AlertIcon } from "@/components/Icons";
import { dayWithStatus, doseKey } from "@/lib/doses";
import { DEMO_PATIENT_ID, getRepo } from "@/lib/data";
import { intlTag, type Locale } from "@/lib/i18n/config";
import { istToUtcMs, utcMsToIstDate } from "@/lib/schedule";
import { nowMs } from "@/lib/time/now";

export const dynamic = "force-dynamic";

export default async function TodayPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const t = await getTranslations("today");
  const locale = (await getLocale()) as Locale;
  const repo = getRepo();
  const now = nowMs();
  const today = utcMsToIstDate(now);
  const [medicines, schedules, events] = await Promise.all([
    repo.listMedicines(DEMO_PATIENT_ID),
    repo.listSchedules(DEMO_PATIENT_ID),
    repo.listDoseEvents(DEMO_PATIENT_ID, new Date(istToUtcMs(today, "00:00")).toISOString()),
  ]);
  const doses = dayWithStatus(schedules, events, today, now);
  const byId = new Map(medicines.map((m) => [m.id, m]));
  const dateLabel = new Intl.DateTimeFormat(intlTag(locale), { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" }).format(now);

  const groups = [
    { key: "now", title: t("dueNow"), items: doses.filter((d) => d.status === "due" || d.status === "missed") },
    { key: "later", title: t("upcoming"), items: doses.filter((d) => d.status === "upcoming") },
    { key: "done", title: t("done"), items: doses.filter((d) => d.status === "taken") },
  ];

  return (
    <>
      <h1>{t("title")}</h1>
      <p className="lead">{t("date", { date: dateLabel })}</p>
      {params.early && (
        <p className="notice notice-error" role="alert">
          <AlertIcon />
          {t("tooEarly")}
        </p>
      )}
      {params.error && (
        <p className="notice notice-error" role="alert">
          <AlertIcon />
          {t("error")}
        </p>
      )}
      {doses.length === 0 && <p>{t("noDoses")}</p>}
      {doses.length > 0 && doses.every((d) => d.status === "taken") && <p className="notice notice-ok">{t("allDone")}</p>}
      {groups.map(
        (g) =>
          g.items.length > 0 && (
            <section key={g.key} aria-labelledby={`h-${g.key}`}>
              <h2 id={`h-${g.key}`}>{g.title}</h2>
              <ul className="dose-list">
                {g.items.map((d) => {
                  const med = byId.get(d.medicineId);
                  return med ? <DoseCard key={doseKey(d.medicineId, d.dueAtUtc)} dose={d} medicine={med} justDone={params.done === doseKey(d.medicineId, d.dueAtUtc)} /> : null;
                })}
              </ul>
            </section>
          ),
      )}
    </>
  );
}
