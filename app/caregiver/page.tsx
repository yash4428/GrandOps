import { getLocale, getTranslations } from "next-intl/server";
import { adherence, adherencePercent, dayWithStatus } from "@/lib/doses";
import { DEMO_PATIENT_ID, getRepo } from "@/lib/data";
import { intlTag, type Locale } from "@/lib/i18n/config";
import { medicineLabel } from "@/lib/i18n/labels";
import { addDays, istToUtcMs, utcMsToIstDate } from "@/lib/schedule";
import { nowMs } from "@/lib/time/now";

export const dynamic = "force-dynamic";

export default async function CaregiverPage() {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const repo = getRepo();
  const now = nowMs();
  const today = utcMsToIstDate(now);
  const start = addDays(today, -6);
  const [medicines, schedules, events] = await Promise.all([
    repo.listMedicines(DEMO_PATIENT_ID),
    repo.listSchedules(DEMO_PATIENT_ID),
    repo.listDoseEvents(DEMO_PATIENT_ID, new Date(istToUtcMs(start, "00:00")).toISOString()),
  ]);
  const days = adherence(schedules, events, today, 7, now);
  const percent = adherencePercent(days);
  const byId = new Map(medicines.map((m) => [m.id, m]));
  const missed = days.flatMap((d) => dayWithStatus(schedules, events, d.date, now).filter((x) => x.status === "missed")).reverse();
  const dayFmt = new Intl.DateTimeFormat(intlTag(locale), { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const fmtDate = (d: string) => dayFmt.format(new Date(`${d}T00:00:00Z`));

  return (
    <>
      <h1>{t("caregiver.title")}</h1>
      <p className="lead">{t("caregiver.intro")}</p>
      <section className="card" aria-labelledby="adh">
        <h2 id="adh">{t("caregiver.adherence")}</h2>
        {percent === null ? <p>{t("caregiver.noData")}</p> : <p className="big-number">{t("caregiver.percent", { percent })}</p>}
      </section>
      <table>
        <thead>
          <tr>
            <th scope="col">{t("caregiver.day")}</th>
            <th scope="col">{t("caregiver.scheduled")}</th>
            <th scope="col">{t("caregiver.taken")}</th>
            <th scope="col">{t("caregiver.missedCount")}</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <th scope="row">{fmtDate(d.date)}</th>
              <td>{d.scheduled}</td>
              <td>{d.taken}</td>
              <td>{d.missed}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>{t("caregiver.missedTitle")}</h2>
      {missed.length === 0 ? (
        <p>{t("caregiver.noMissed")}</p>
      ) : (
        <ul>
          {missed.slice(0, 20).map((m) => {
            const med = byId.get(m.medicineId);
            return (
              <li key={`${m.medicineId}${m.dueAtUtc}`}>
                {fmtDate(m.istDate)} · {t("today.at", { time: m.time })} · {med ? medicineLabel(t, med) : ""}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
