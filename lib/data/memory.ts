import type { DoseEvent } from "../doses";
import { doseKey } from "../doses";
import type { Schedule } from "../schedule";
import { DEMO_PATIENT_ID, seedMedicines, seedSchedules } from "./seed";
import type { Medicine, Repo, UserReport } from "./types";

interface Store {
  medicines: Map<string, Medicine[]>;
  schedules: Map<string, Schedule[]>;
  events: Map<string, Map<string, DoseEvent>>;
  reports: Map<string, UserReport>;
}

/** In-memory repo for local dev, unit tests and CI personas without the emulator. */
export function createMemoryRepo(): Repo {
  const store: Store = {
    medicines: new Map([[DEMO_PATIENT_ID, structuredClone(seedMedicines)]]),
    schedules: new Map([[DEMO_PATIENT_ID, structuredClone(seedSchedules)]]),
    events: new Map(),
    reports: new Map(),
  };
  return {
    async listMedicines(patientId) {
      return store.medicines.get(patientId) ?? [];
    },
    async listSchedules(patientId) {
      return store.schedules.get(patientId) ?? [];
    },
    async upsertMedicine(patientId, medicine, schedule) {
      const meds = (store.medicines.get(patientId) ?? []).filter((m) => m.id !== medicine.id);
      const scheds = (store.schedules.get(patientId) ?? []).filter((s) => s.medicineId !== medicine.id);
      store.medicines.set(patientId, [...meds, medicine]);
      store.schedules.set(patientId, [...scheds, schedule]);
    },
    async listDoseEvents(patientId, sinceUtc) {
      return [...(store.events.get(patientId)?.values() ?? [])].filter((e) => e.dueAtUtc >= sinceUtc);
    },
    async addDoseEvent(patientId, event) {
      const events = store.events.get(patientId) ?? new Map<string, DoseEvent>();
      const key = doseKey(event.medicineId, event.dueAtUtc);
      if (events.has(key)) return false;
      events.set(key, event);
      store.events.set(patientId, events);
      return true;
    },
    async addReport(report) {
      store.reports.set(report.id, report);
    },
    async setReportIssue(reportId, issueIid) {
      const r = store.reports.get(reportId);
      if (r) r.issueIid = issueIid;
    },
  };
}
