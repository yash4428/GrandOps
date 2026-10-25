import type { Medicine } from "../data/types";

type Translate = (key: string) => string;

/** Display name for a medicine: translated for seeded ones, as typed for custom ones. */
export function medicineLabel(t: Translate, m: Medicine): string {
  if (m.nameKey) return t(`medicineNames.${m.nameKey}`);
  return m.customName ?? "";
}
