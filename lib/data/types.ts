import type { DoseEvent } from "../doses";
import type { Schedule } from "../schedule";

export interface Medicine {
  id: string;
  /** Message key under "medicineNames" for seeded medicines (always translated). */
  nameKey: string | null;
  /** Free-text name typed by a caregiver, shown as entered. */
  customName: string | null;
  /** Plain-language instruction key from messages, e.g. "afterFood". */
  instruction: "afterFood" | "beforeFood" | "withWater" | "bedtime";
  /** Dose amount shown to the patient, e.g. "1 tablet". */
  doseCount: number;
  colour: "white" | "yellow" | "pink" | "blue";
}

export interface UserReport {
  id: string;
  createdAtUtc: string;
  locale: string;
  route: string;
  reason: "cantPress" | "cantRead" | "wrongLanguage" | "slow" | "wrongTime" | "other";
  /** Text as typed or transcribed, in the original language. Names redacted. */
  text: string;
  source: "text" | "voice";
  appVersion: string;
  device: string;
  /** GitLab issue IID once filed. */
  issueIid: number | null;
}

export interface Repo {
  listMedicines(patientId: string): Promise<Medicine[]>;
  listSchedules(patientId: string): Promise<Schedule[]>;
  upsertMedicine(patientId: string, medicine: Medicine, schedule: Schedule): Promise<void>;
  listDoseEvents(patientId: string, sinceUtc: string): Promise<DoseEvent[]>;
  addDoseEvent(patientId: string, event: DoseEvent): Promise<boolean>;
  addReport(report: UserReport): Promise<void>;
  setReportIssue(reportId: string, issueIid: number): Promise<void>;
}
