import { Firestore } from "@google-cloud/firestore";
import type { DoseEvent } from "../doses";
import { doseKey } from "../doses";
import type { Schedule } from "../schedule";
import { DEMO_PATIENT_ID, seedMedicines, seedSchedules } from "./seed";
import type { Medicine, Repo, UserReport } from "./types";

/**
 * Firestore (Native mode) repo. Uses the emulator when FIRESTORE_EMULATOR_HOST is set.
 * Layout: patients/{id}/medicines/{medId} (medicine + schedule), patients/{id}/doses/{key}, reports/{id}.
 */
export function createFirestoreRepo(db = new Firestore({ projectId: process.env.GOOGLE_CLOUD_PROJECT })): Repo {
  const patient = (id: string) => db.collection("patients").doc(id);
  let seeded: Promise<void> | null = null;

  async function ensureSeed(patientId: string): Promise<void> {
    if (patientId !== DEMO_PATIENT_ID) return;
    seeded ??= (async () => {
      const snap = await patient(patientId).collection("medicines").limit(1).get();
      if (!snap.empty) return;
      const batch = db.batch();
      for (const m of seedMedicines) {
        const schedule = seedSchedules.find((s) => s.medicineId === m.id);
        batch.set(patient(patientId).collection("medicines").doc(m.id), { medicine: m, schedule });
      }
      await batch.commit();
    })();
    await seeded;
  }

  async function readMeds(patientId: string): Promise<{ medicine: Medicine; schedule: Schedule }[]> {
    await ensureSeed(patientId);
    const snap = await patient(patientId).collection("medicines").get();
    return snap.docs.map((d) => d.data() as { medicine: Medicine; schedule: Schedule });
  }

  return {
    async listMedicines(patientId) {
      return (await readMeds(patientId)).map((r) => r.medicine);
    },
    async listSchedules(patientId) {
      return (await readMeds(patientId)).map((r) => r.schedule);
    },
    async upsertMedicine(patientId, medicine, schedule) {
      await patient(patientId).collection("medicines").doc(medicine.id).set({ medicine, schedule });
    },
    async listDoseEvents(patientId, sinceUtc) {
      const snap = await patient(patientId).collection("doses").where("dueAtUtc", ">=", sinceUtc).get();
      return snap.docs.map((d) => d.data() as DoseEvent);
    },
    async addDoseEvent(patientId, event) {
      // create() fails if the doc exists, so a dose can only be logged once.
      try {
        await patient(patientId).collection("doses").doc(encodeURIComponent(doseKey(event.medicineId, event.dueAtUtc))).create(event);
        return true;
      } catch (err) {
        if ((err as { code?: number }).code === 6) return false; // ALREADY_EXISTS
        throw err;
      }
    },
    async addReport(report: UserReport) {
      await db.collection("reports").doc(report.id).set(report);
    },
    async setReportIssue(reportId, issueIid) {
      await db.collection("reports").doc(reportId).update({ issueIid });
    },
  };
}
