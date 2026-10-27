# Sustainability: measuring and reducing carbon (SCI)

## Method

We use the Green Software Foundation **Software Carbon Intensity** spec (ISO/IEC 21031:2024):

**SCI = ((E × I) + M) per R**

| Term | How we get it | Code |
|---|---|---|
| **E** energy (kWh) | For every CI job: duration × vCPUs × watts-per-vCPU, plus memory × kWh/GB-h, × PUE. Watts-per-vCPU = min + utilisation × (max − min). For deploys: Cloud Run instance time during the canary window (canary + stable). | `scripts/sci/model.ts` |
| **I** grid intensity (gCO₂e/kWh) | Per region where the work ran: GitLab.com hosted runners (assumed `us-east1`) and Cloud Run in `asia-south1`. | `coefficients.json` |
| **M** embodied | Server embodied emissions × (time used / lifespan) × (vCPUs used / server vCPUs). | `model.ts` |
| **R** functional unit | **Per production deployment** (deploy pipeline + average MR pipeline feeding it) and **per MR**. | `scripts/sci/index.ts` |

All coefficients, with source and a `verify` flag, are in [`scripts/sci/coefficients.json`](../scripts/sci/coefficients.json). They follow the [Cloud Carbon Footprint methodology](https://www.cloudcarbonfootprint.org/docs/methodology) and Google's published per-region grid data. **Before submission, every `verify: true` value must be checked against its source and this note updated.**

### AI inference (reported separately, uncertain)

Duo flow sessions use LLM inference whose energy we cannot measure. We report it as a separate low–high line per pipeline (`llmUncertainG`), from session count × per-session bounds, and **exclude it from the headline SCI**. Bounds are order-of-magnitude; treat them as such.

### Assumptions and uncertainty

- Runner location (`us-east1`) is an assumption, not published by GitLab.
- 50% average CPU utilisation (CCF default) when real utilisation is unknown.
- Job duration includes queue-free run time only; image pulls are inside it.
- Cloud Run energy covers the canary window only, not steady-state serving.

## What we do to reduce it

| Practice | Where |
|---|---|
| `rules:changes` on every job: docs-only MRs skip build, tests, personas, images | `ci/*.yml` |
| Impact-selected unit tests on tier 0/1 MRs (`vitest --changed`); full suite on main + tier 2 | `test:unit` |
| Caches: pnpm store, Next build cache, Docker layer cache; `interruptible` + auto-cancel | `ci/base.yml` |
| Smallest runner (`saas-linux-small-amd64`) everywhere | `ci/base.yml` |
| Carbon budget: `carbon-gate` sets `CARBON_MODE=full|lite|defer`; never for tier 2 or `medication-critical` | `.autopilot/policy.yml`, `scripts/carbon-gate` |
| Page-weight budget enforced by Bittu's persona (JS ≤ 170 KB, page ≤ 600 KB) | `tests/personas/bittu.spec.ts` |
| Server-rendered core flow: "Dose taken" works without client JS | `app/actions.ts` |
| Scale-to-zero staging, `min-instances=0` prod outside judging | `infra/terraform/run.tf` |
| `model_size_preference: small` for non-coding agents | `.gitlab/duo/flows` |

## Before / after (measured)

Job-minutes come from the GitLab API for this project's real pipelines on 27 Oct 2026. Carbon is calculated with the coefficients above: a small runner (2 vCPU, 8 GB, 50% CPU, PUE 1.1, us-east1 grid 560 gCO₂e/kWh) emits about **0.083 g operational + 0.018 g embodied ≈ 0.10 gCO₂e per job-minute**. The `sci:report` job independently computed 1.91 g for a ~18 job-minute main pipeline.

| Pipeline | Jobs run | Job-minutes | ≈ gCO₂e |
|---|---|---|---|
| Main: test + secure + package | 25 | 17.2–18.6 | 1.7–1.9 |
| Main + deploy to Cloud Run + canary | 29–33 | 27–35 | 2.7–3.5 |
| MR changing app code (!1, !3) | 22 | 16.2–17.6 | 1.6–1.8 |
| MR changing only CI (!2), with change-aware rules | 15 | 10.1 | 1.0 |
| **Reduction from change-aware rules (CI-only MR vs app MR)** | | **≈ 43%** | **≈ 0.7 g per MR** |

**Limits.** This compares real MRs that changed different files, not a controlled A/B test of identical MRs with a naive "everything every time" profile; that baseline run was not completed before the deadline. The coefficients are CCF defaults flagged `verify`, and the runner region is an assumption. LLM inference for Duo sessions is not included.
