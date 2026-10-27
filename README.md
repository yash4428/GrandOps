# GrandOps

**A hands-off, self-healing delivery loop on the GitLab Duo Agent Platform, for software that elderly people depend on.**

A team of Duo agents takes over everything after code is written: plan → create → verify → package → secure → release → configure → monitor → govern. It ships `<APP_NAME>`, a small medicine-reminder web app for elderly patients and caregivers in India (English, हिन्दी, ਪੰਜਾਬੀ).

> **All data is synthetic.** No real people, phone numbers, ID numbers or medical records exist anywhere in this project. Built with India's DPDP Act principles in mind (data minimisation, purpose limitation); no legal claims.

## Why

Small health and NGO teams have no DevOps, QA, security or accessibility engineer. For their users, ordinary bugs are not ordinary: a button that shrinks from 48 px to 32 px is a missed tap for someone with a tremor, which is a missed dose.

## What it does

- **Synthetic grandparents gate every merge and deploy.** Five deterministic Playwright personas: **Kamla** (tremor: 48 px targets, jittered taps), **Harbans** (low vision: 320 px reflow, 18 px text, AAA contrast), **Rano** (Punjabi only: no English leaks, Gurmukhi font), **Mohan** (screen reader: axe-core, keyboard-only dose logging), **Bittu's ₹6,000 phone on 3G** (LCP < 3 s, JS ≤ 170 KB). Reusable as `packages/persona-kit`.
- **Agents do, scripts decide.** Duo flows plan, code, review, fix security findings, heal incidents, write postmortems. A deterministic merge gate, canary watcher and rollback job make every decision. No agent can merge, deploy or roll back.
- **Self-healing.** Canary (10%) → SLO watch → automatic rollback → incident → Healer fix MR → Scribe postmortem → a lesson in `AGENTS.md` that every agent reads next time.
- **Chaos vs healers** on staging only, with a scoreboard (MTTD / MTTR).
- **Earned autonomy.** Risk tiers by path, trust scores per agent; trust changes how much verification runs, never the tier-2 floor.
- **Green layer.** SCI (ISO/IEC 21031) per MR and per deployment, a monthly carbon budget, and a smart pipeline that skips what a change can't affect.
- **"Something's wrong" button.** Tap, type or speak (Hindi/Punjabi speech-to-text) → anonymised GitLab issue → the loop.
- **Release notes for humans** in English, Hindi and Punjabi, shown in the app.
- **Mission Control** (`/mission-control`): the nine stages lighting up live.

## How GitLab automates the post-code lifecycle

| Stage | What runs |
|---|---|
| Plan | Triage flow: labels, risk tier, acceptance criteria, persona plan, dedupe, child tasks |
| Create | Builder flow (supervisor + developer, tester, persona_fixer), self-verifies before pushing |
| Verify | lint, types, unit (impact-selected), e2e, i18n, 5 personas + MR card, Elder-care Reviewer (+ second reviewer on tier 2), Code Review flow |
| Secure | SAST, Secret Detection, Dependency + Container Scanning, Sentinel flow |
| Package | Container Registry + Artifact Registry, CycloneDX SBOM, persona-kit on the Package Registry |
| Release | staging → live personas → chaos-guard → canary → promote, GitLab Release with EN/HI/PA notes |
| Configure | Terraform (OpenTofu in CI) with GitLab-managed state, WIF (no keys) |
| Monitor | canary SLO watch, rollback + incident, scheduled synthetic monitor, Error Tracking, Healer, Chaos |
| Govern | policy file + merge gate, CODEOWNERS, trust ledger, audit record per release, PII scan, SCI |

Details: [`docs/architecture.md`](docs/architecture.md), [`docs/agents.md`](docs/agents.md), [`docs/sustainability.md`](docs/sustainability.md), [`docs/adr/0001-loop-wiring.md`](docs/adr/0001-loop-wiring.md).

## Live

| | URL |
|---|---|
| App (staging, Cloud Run asia-south1) | https://app-staging-anhze6ketq-el.a.run.app |
| Mission Control | https://app-staging-anhze6ketq-el.a.run.app/mission-control |
| Production (canary-gated) | https://app-prod-anhze6ketq-el.a.run.app |

Production only receives a build after the canary passes its SLO. The first canary breached p95 and was rolled back automatically (pipeline 2993785004).

## Run it locally

Requirements: Node 22+, pnpm 10.

```bash
pnpm install
pnpm dev                     # http://localhost:3000 (in-memory synthetic data)
pnpm test                    # unit + script tests
pnpm build && pnpm personas  # the five personas
pnpm e2e
```

Firestore emulator instead of memory: `pnpm emulators`, then `DATA_BACKEND=firestore FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 pnpm dev`.

Pin the clock for demos: `DEMO_NOW=2026-10-25T09:30:00+05:30 pnpm dev` (ignored in production).

## Licence

MIT, see [`LICENSE`](LICENSE). Third-party dependencies are under OSI-approved licences. Icons are drawn inline in the style of Lucide (ISC).
