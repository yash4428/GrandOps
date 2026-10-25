// SYNTHETIC DATA ONLY. No real people, phone numbers or medical records.
import type { Schedule } from "../schedule";
import type { Medicine } from "./types";

export const DEMO_PATIENT_ID = "demo-patient-1";

export const seedMedicines: Medicine[] = [
  { id: "med-bp", nameKey: "bp", customName: null, instruction: "afterFood", doseCount: 1, colour: "white" },
  { id: "med-sugar", nameKey: "sugar", customName: null, instruction: "beforeFood", doseCount: 1, colour: "yellow" },
  { id: "med-vit", nameKey: "vitaminD", customName: null, instruction: "withWater", doseCount: 1, colour: "pink" },
  { id: "med-sleep", nameKey: "calcium", customName: null, instruction: "bedtime", doseCount: 2, colour: "blue" },
];

export const seedSchedules: Schedule[] = [
  { medicineId: "med-bp", times: ["08:00", "20:00"], startDate: "2026-10-01", endDate: null },
  { medicineId: "med-sugar", times: ["07:30", "13:00", "19:30"], startDate: "2026-10-01", endDate: null },
  { medicineId: "med-vit", times: ["09:00"], startDate: "2026-10-01", endDate: null },
  { medicineId: "med-sleep", times: ["21:30"], startDate: "2026-10-01", endDate: null },
];
