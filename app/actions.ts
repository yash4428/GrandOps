"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { canMarkTaken, doseKey } from "@/lib/doses";
import { DEMO_PATIENT_ID, getRepo } from "@/lib/data";
import { log } from "@/lib/errors/report";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n/config";
import { dosesForDay, parseTimeOfDay, utcMsToIstDate } from "@/lib/schedule";
import { nowMs } from "@/lib/time/now";

export async function setLocale(formData: FormData): Promise<void> {
  const locale = formData.get("locale");
  if (isLocale(locale)) {
    (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  revalidatePath("/", "layout");
}

export async function markDoseTaken(formData: FormData): Promise<void> {
  const medicineId = String(formData.get("medicineId") ?? "");
  const dueAtUtc = String(formData.get("dueAtUtc") ?? "");
  const repo = getRepo();
  const now = nowMs();
  const today = utcMsToIstDate(now);
  const dueMs = Date.parse(dueAtUtc);
  // Only doses that are actually scheduled (today or yesterday's late doses) may be marked.
  const dates = [today, utcMsToIstDate(now - 24 * 3600_000)];
  const schedules = await repo.listSchedules(DEMO_PATIENT_ID);
  const dose = dates.flatMap((d) => dosesForDay(schedules, d)).find((d) => d.medicineId === medicineId && d.dueAtUtc === dueAtUtc);
  if (!dose || Number.isNaN(dueMs)) redirect("/?error=1");
  const events = await repo.listDoseEvents(DEMO_PATIENT_ID, dueAtUtc);
  const taken = new Set(events.map((e) => doseKey(e.medicineId, e.dueAtUtc)));
  if (!canMarkTaken(dose, taken, now)) redirect("/?early=1");
  await repo.addDoseEvent(DEMO_PATIENT_ID, { medicineId, dueAtUtc, takenAtUtc: new Date(now).toISOString() });
  log("info", "dose_taken", { onTime: now <= dueMs + 3600_000 });
  revalidatePath("/");
  redirect(`/?done=${encodeURIComponent(doseKey(medicineId, dueAtUtc))}#done`);
}

const INSTRUCTIONS = ["afterFood", "beforeFood", "withWater", "bedtime"] as const;
const COLOURS = ["white", "yellow", "pink", "blue"] as const;

export async function addMedicine(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const time = String(formData.get("time") ?? "");
  const instruction = INSTRUCTIONS.find((i) => i === formData.get("instruction")) ?? "afterFood";
  const colour = COLOURS.find((c) => c === formData.get("colour")) ?? "white";
  const count = Math.min(Math.max(Number(formData.get("count")) || 1, 1), 4);
  try {
    parseTimeOfDay(time);
  } catch {
    redirect("/medicines?invalid=1");
  }
  if (!name) redirect("/medicines?invalid=1");
  const id = `med-${crypto.randomUUID().slice(0, 8)}`;
  await getRepo().upsertMedicine(
    DEMO_PATIENT_ID,
    { id, nameKey: null, customName: name, instruction, doseCount: count, colour },
    { medicineId: id, times: [time], startDate: utcMsToIstDate(nowMs()), endDate: null },
  );
  revalidatePath("/");
  revalidatePath("/medicines");
  redirect("/medicines?saved=1");
}
