# AGENTS.md

House rules for every GitLab Duo agent and flow working in this repository.
Read this whole file before acting. Items under "Lessons learned" are rules, not suggestions.

## What this repo is

A medicine-reminder web app for elderly patients and their caregivers in India (English,
Hindi, Punjabi). People who use it may have a hand tremor, low vision, read only Punjabi, use a
screen reader, or have a cheap phone on 3G. A small UI bug can mean a missed dose.
All data is synthetic. Never add real names, phone numbers, ID numbers or medical records.

## Hard limits

- You never merge, never deploy, never roll back. The `autopilot:merge-gate` CI job merges;
  pipelines deploy; `deploy:canary-watch` + `deploy:rollback` roll back.
- Never edit `.autopilot/**`, `LICENSE`, `CODEOWNERS`, `.gitlab-ci.yml` or `ci/**` in an MR you
  expect to auto-merge. Those MRs are labelled `needs-human` by the gate.
- Never weaken a test, persona check, threshold, security job or policy to make something pass.
- Chaos only ever targets staging.

## Code rules

- Dose and schedule maths only through `lib/schedule` and `lib/doses`. Store UTC, show IST
  (`Asia/Kolkata`, fixed +05:30). Never do local-time `Date` arithmetic.
- `lib/schedule/**` and `lib/doses/**` are tier 2: pure functions, 100% branch coverage,
  property tests with fast-check.
- Every user-facing string lives in `messages/en.json`, `hi.json` and `pa.json`, added to all
  three in the same commit. Never leave English text in `hi` or `pa`.
- Interactive targets at least 48×48 CSS px with 8px spacing; body text at least 18px; key text
  contrast at least 7:1; full keyboard path; semantic HTML first.
- Logs are structured JSON with no PII (`lib/errors/report.ts` → `log()`).
- TypeScript strict. No `any` without a comment saying why.
- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `test:`.

## Checks to run before pushing

```bash
pnpm install --frozen-lockfile
pnpm lint && pnpm typecheck && pnpm test
pnpm build && pnpm personas
```

## MR description template (Builder, Healer)

```
Closes #<issue>

## What changed
## Checks run locally
## Lessons applied
## Caregiver notes
- en: <one plain sentence>
- hi: <same in Hindi>
- pa: <same in Punjabi>
## Expected carbon impact
```

## Review verdict marker (reviewers)

Start your MR note with exactly one of:
`[autopilot:review reviewer=elder-care verdict=APPROVE]` or `verdict=CHANGES`
(`reviewer=elder-care-second` for the tier 2 second reviewer).

## Lessons learned

_Written by Scribe after incidents and chaos rounds. One bullet per lesson, newest last._
