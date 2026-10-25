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

## Before / after

Measured by running the same MRs with `CI_PROFILE=baseline` (a manual pipeline: naive, everything every time) and the default smart profile. The SCI ledger (`sci.json` on the `autopilot-data` branch) keeps both.

| Profile | MRs measured | g CO₂e per MR | g CO₂e per deployment |
|---|---|---|---|
| Baseline | _TBD_ | _TBD_ | _TBD_ |
| Smart | _TBD_ | _TBD_ | _TBD_ |
| Reduction | | _TBD_ | _TBD_ |

_No numbers until real pipelines have run. Do not fill this table by estimate._

> Note: a true "baseline" profile needs the rules to ignore `changes:`; set up the baseline runs as described in `docs/demo-script.md` before recording.
