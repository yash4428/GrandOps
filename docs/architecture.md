# Architecture

```
 human issue ─┐        grandparent taps "Something's wrong" ─┐
              ▼                                               ▼ (app files issue, bot)
        ┌──────────┐ plan  ┌──────────┐ MR  ┌───────────────────────────────────┐
        │ TRIAGE   │──────▶│ BUILDER  │────▶│ MR pipeline                       │
        └──────────┘       │ dev/test/│     │ lint · types · unit · e2e · i18n  │
              ▲            │ personas │     │ persona:{kamla,harbans,rano,      │
              │            └──────────┘     │   mohan,bittu} · SAST · secrets · │
              │   Reviewer + Sentinel ─────▶│   deps · container · SCI          │
              │                             │ autopilot:merge-gate (no AI)      │
              │                             └──────────────┬────────────────────┘
              │                                            │ auto-merge
              │      main: image → AR → staging → verify-live personas →
              │      chaos-guard → canary 10% → canary-watch (SLO) ─┬─▶ promote → release (EN/HI/PA)
              │                                                     │      → trust, audit, SCI
              │                                                     └─▶ rollback (no AI) → incident
        ┌─────┴─────┐  diagnosis + fix MR      ┌─────────┐
        │  HEALER   │◀─────────────────────────│ MONITOR │◀── scheduled synthetic monitor
        └─────┬─────┘                          └─────────┘
              ▼ SCRIBE: postmortem + lesson → AGENTS.md → every agent reads it next run
```

## Components

| Part | Where |
|---|---|
| App (Next.js App Router, TS strict) | `app/`, `components/`, `lib/` |
| Tier-2 dose logic | `lib/schedule`, `lib/doses` (pure, 100% branch coverage, property tests) |
| Data | `lib/data`: Firestore (Native) on Cloud Run, emulator or memory repo locally/CI |
| i18n | `messages/{en,hi,pa}.json` via next-intl, locale cookie / Accept-Language |
| Chaos flags | `lib/flags` (env or GitLab Feature Flags via Unleash API); ignored when `APP_ENV=production` |
| Error tracking | `lib/errors/report.ts`: Sentry protocol → GitLab Error Tracking DSN |
| User reports | `app/api/reports` → redact → Speech-to-Text (hi-IN/pa-IN) → Firestore → GitLab issue |
| Mission Control | `app/mission-control`, `lib/mission-control` (read-only GitLab API, server-side token, 5 s cache) |
| Persona checks | `packages/persona-kit` (published), `tests/personas` |
| Policy | `.autopilot/policy.yml` |
| Ledgers | branch `autopilot-data`: `sci.json`, `trust.json`, `chaos.json`, `diary.json`, `audit/releases/*` |
| Infra | `infra/terraform` (Cloud Run, AR, Firestore, Secret Manager, WIF) |

## Why ledgers live on a data branch

Trust, SCI, chaos and diary data are written by deterministic jobs many times a day. Committing them to `main` would trigger pipelines and pollute history; Firestore would hide them from judges. A dedicated branch (`[skip ci]`, excluded in `workflow:rules`) keeps every change auditable in GitLab.
