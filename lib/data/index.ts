import "server-only";
import { createFirestoreRepo } from "./firestore";
import { createMemoryRepo } from "./memory";
import type { Repo } from "./types";

export type { Medicine, Repo, UserReport } from "./types";
export { DEMO_PATIENT_ID } from "./seed";

const globalRepo = globalThis as unknown as { __repo?: Repo };

export function getRepo(): Repo {
  globalRepo.__repo ??= process.env.DATA_BACKEND === "firestore" ? createFirestoreRepo() : createMemoryRepo();
  return globalRepo.__repo;
}
