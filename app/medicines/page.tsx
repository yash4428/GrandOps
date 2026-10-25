import { getTranslations } from "next-intl/server";
import { addMedicine } from "@/app/actions";
import { AlertIcon, CheckIcon } from "@/components/Icons";
import { DEMO_PATIENT_ID, getRepo } from "@/lib/data";
import { medicineLabel } from "@/lib/i18n/labels";

export const dynamic = "force-dynamic";

export default async function MedicinesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const t = await getTranslations();
  const repo = getRepo();
  const [medicines, schedules] = await Promise.all([repo.listMedicines(DEMO_PATIENT_ID), repo.listSchedules(DEMO_PATIENT_ID)]);
  const timesFor = new Map(schedules.map((s) => [s.medicineId, [...s.times].sort()]));
  return (
    <>
      <h1>{t("medicines.title")}</h1>
      <p className="lead">{t("medicines.intro")}</p>
      {params.saved && (
        <p className="notice notice-ok" role="status">
          <CheckIcon />
          {t("medicines.saved")}
        </p>
      )}
      <ul className="dose-list">
        {medicines.map((m) => (
          <li key={m.id} className="card">
            <h2 className="dose-name">{medicineLabel(t, m)}</h2>
            <p className="dose-meta">
              {t("today.doseCount", { count: m.doseCount })} · {t(`colours.${m.colour}`)} · {t(`instructions.${m.instruction}`)}
            </p>
            <p>
              <strong>{t("medicines.times")}:</strong> {(timesFor.get(m.id) ?? []).join(", ")}
            </p>
          </li>
        ))}
      </ul>

      <h2 id="add">{t("medicines.addTitle")}</h2>
      {params.invalid && (
        <p className="notice notice-error" role="alert">
          <AlertIcon />
          {t("medicines.invalid")}
        </p>
      )}
      <form action={addMedicine} aria-labelledby="add">
        <div className="field">
          <label htmlFor="name">{t("medicines.name")}</label>
          <input id="name" name="name" required maxLength={60} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="time">{t("medicines.time")}</label>
          <input id="time" name="time" type="time" required defaultValue="08:00" />
        </div>
        <div className="field">
          <label htmlFor="instruction">{t("medicines.instruction")}</label>
          <select id="instruction" name="instruction" defaultValue="afterFood">
            {(["afterFood", "beforeFood", "withWater", "bedtime"] as const).map((i) => (
              <option key={i} value={i}>
                {t(`instructions.${i}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="count">{t("medicines.count")}</label>
          <select id="count" name="count" defaultValue="1">
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {t("today.doseCount", { count: n })}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="colour">{t("medicines.colour")}</label>
          <select id="colour" name="colour" defaultValue="white">
            {(["white", "yellow", "pink", "blue"] as const).map((c) => (
              <option key={c} value={c}>
                {t(`colours.${c}`)}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary">
          {t("medicines.save")}
        </button>
      </form>
    </>
  );
}
