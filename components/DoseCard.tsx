import { getTranslations } from "next-intl/server";
import { markDoseTaken } from "@/app/actions";
import type { DoseWithStatus } from "@/lib/doses";
import type { Medicine } from "@/lib/data";
import { medicineLabel } from "@/lib/i18n/labels";
import { formatIstTime } from "@/lib/schedule";
import { AlertIcon, CheckIcon, ClockIcon } from "./Icons";

export async function DoseCard({ dose, medicine, justDone }: { dose: DoseWithStatus; medicine: Medicine; justDone: boolean }) {
  const t = await getTranslations();
  const name = medicineLabel(t, medicine);
  const headingId = `dose-${medicine.id}-${dose.time.replace(":", "")}`;
  return (
    <li className="dose-card" data-status={dose.status} data-testid="dose-card" aria-labelledby={headingId}>
      <div className="dose-time">{t("today.at", { time: dose.time })}</div>
      <h3 className="dose-name" id={headingId}>
        {name}
      </h3>
      <p className="dose-meta">
        {t("today.doseCount", { count: medicine.doseCount })} · {t(`colours.${medicine.colour}`)} · {t(`instructions.${medicine.instruction}`)}
      </p>
      {dose.status === "taken" ? (
        <p className="status-pill status-taken" id={justDone ? "done" : undefined} tabIndex={justDone ? -1 : undefined}>
          <CheckIcon />
          {justDone ? t("today.confirmed") + " " : ""}
          {t("today.takenAt", { time: formatIstTime(dose.takenAtUtc ?? dose.dueAtUtc) })}
        </p>
      ) : (
        <>
          {dose.status === "missed" && (
            <p className="status-pill status-missed">
              <AlertIcon />
              {t("today.missed")}
            </p>
          )}
          {dose.status === "upcoming" && (
            <p className="status-pill">
              <ClockIcon />
              {t("today.upcoming")}
            </p>
          )}
          <form action={markDoseTaken}>
            <input type="hidden" name="medicineId" value={dose.medicineId} />
            <input type="hidden" name="dueAtUtc" value={dose.dueAtUtc} />
            <button type="submit" className="btn btn-primary" data-testid="dose-taken" aria-describedby={headingId}>
              <CheckIcon />
              {t("today.doseTaken")}
            </button>
          </form>
        </>
      )}
    </li>
  );
}
