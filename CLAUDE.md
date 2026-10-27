# CLAUDE.md

Guidance for Claude Code working in this repository. **Read `PRD.md` before any non-trivial task.** It is the full spec. This file holds the rules, conventions, and context you need on every task.

---

## 1. What this project is (30-second version)

`<PROJECT_NAME>` (placeholder; Yash will choose the real name, so **never invent or change the project name**) is our entry for **"Life After Code", the GitLab Transcend Hackathon** on Devpost.

We are building a **hands-off, self-healing delivery loop on the GitLab Duo Agent Platform**. A team of Duo agents (custom flows) takes over everything after code is written: plan → create → verify → package → secure → release → configure → monitor → govern. It ships a small **medicine-reminder web app for elderly patients and caregivers in India** (`<APP_NAME>`, also a placeholder).

The app is deliberately simple. **The automation around it is the product being judged.**

Signature ideas (details in PRD §7):
- **Synthetic-grandparent persona tests** (Kamla: tremor, Harbans: low vision, Rano: Punjabi-only, Mohan: screen reader, Bittu: ₹6,000 phone on 3G) gate every merge and deploy
- **Self-healing:** canary → deterministic rollback → incident → Healer fix → Scribe postmortem → lesson written into `AGENTS.md`, so all agents learn
- **Chaos agent vs healer agents** on staging, with a scoreboard
- **Earned autonomy:** risk tiers + trust scores change *how much verification* runs, never removing the floor
- **Green layer:** SCI (Software Carbon Intensity) per deploy/MR + carbon budget + measured before/after
- **"Something's wrong" button:** user voice/text complaint in Hindi/Punjabi → GitLab issue → loop
- **Multilingual human release notes** (EN + HI + PA)
- **Mission Control** dashboard showing all 9 stages lighting up live

## 2. Hackathon facts you must respect

- **Deadline: Oct 27, 2026, 13:00 UTC (18:30 IST).** After that nothing in the repo, video, or form may change. Post-deadline work happens only in a fork.
- **Track:** Path A (Start Fresh), **Hands-off** autonomy level. Targeting the **Most Stages Covered** special prize, also eligible for **Most Environmentally Impactful**, plus the **Google Cloud bonus** (+0.2).
- **Path A = all work must be new** (created on/after Oct 5, 2026). Don't copy code from Yash's older projects into this repo. Third-party OSS dependencies are fine.
- **Required:** GitLab Duo Agent Platform features (agents, flows, triggers, MCP). Judging Stage One is pass/fail on this.
- **Repo must be public**, with an **MIT `LICENSE` at the root** that GitLab detects (About section). Never delete or modify `LICENSE`.
- **CI/CD pipeline history must be visible** and show the automation running. Don't squash history away, don't delete pipelines.
- **All dependencies must use OSI-approved licenses.** Check before adding a package. Avoid anything with non-OSI or "source-available" licenses.
- **No third-party trademarks or copyrighted assets** in the app UI, docs images, or anything that might appear in the video. No brand logos except where unavoidable in tool UIs. Use our own icons/illustrations or permissively licensed icon sets (for example Lucide, ISC).
- **Synthetic data only.** No real names, phone numbers, Aadhaar-like IDs, or medical records anywhere: seeds, fixtures, screenshots, logs.
- **GitLab Credits are limited** (500/month per participant). Deterministic work (tests, personas, SCI, merge gate) must never call an LLM. Prefer `model_size_preference: "small"` for non-coding agents.

## 3. Tech stack (decided; don't swap without asking Yash)

| Layer | Choice |
|---|---|
| App | Next.js (App Router) + TypeScript (strict), single service also serving `/mission-control` |
| Package manager | pnpm |
| Data | Firestore (Native mode); Firestore emulator in CI and local dev |
| i18n | `messages/en.json`, `messages/hi.json`, `messages/pa.json` (for example `next-intl`) |
| Unit tests | Vitest |
| E2E + personas | Playwright + `@axe-core/playwright` |
| Perf | Playwright CDP throttling (+ optional Lighthouse CI) |
| Error tracking | Sentry-compatible SDK → **GitLab Error Tracking** |
| Infra | Terraform (GitLab-managed state) → Cloud Run (staging + prod), Artifact Registry, Firestore, Secret Manager, Workload Identity Federation (OIDC, no SA keys) |
| Speech | Google Cloud Speech-to-Text (`hi-IN`, `pa-IN`) for voice reports; optional Text-to-Speech for release-note audio |
| Region | `asia-south1` for prod (see `docs/adr/0002-region.md`) |
| CI | GitLab CI/CD (`.gitlab-ci.yml` + `ci/*.yml` includes), GitLab security templates |
| Agents | GitLab Duo custom flows (YAML in `.gitlab/duo/flows/`), foundational flows, `AGENTS.md`, `.gitlab/duo/agent-config.yml` |

## 4. Repository map

```
LICENSE  README.md  AGENTS.md  CLAUDE.md  PRD.md
app/ components/ lib/            # Next.js app. lib/schedule/** and lib/doses/** are TIER 2 (dose-critical)
messages/{en,hi,pa}.json
tests/unit  tests/e2e  tests/personas/{kamla,harbans,rano,mohan,bittu}
packages/persona-kit/            # reusable persona checks, published to GitLab Package Registry
scripts/{merge-gate,sci,carbon-gate,trust,diary,audit,chaos-guard}/
infra/terraform/
ci/*.yml                          # included by .gitlab-ci.yml
.gitlab/duo/agent-config.yml      # flow execution env (read ONLY from default branch)
.gitlab/duo/flows/*.yaml          # source of truth for custom flow YAML
.autopilot/policy.yml             # risk tiers, forbidden paths, carbon budget, canary settings
docs/{architecture,agents,sustainability,demo-script}.md
docs/adr/  docs/postmortems/
audit/releases/
```

**`AGENTS.md` vs `CLAUDE.md`:** `AGENTS.md` is read by **GitLab Duo flows** at runtime (house rules + "Lessons learned" written by the Scribe agent). `CLAUDE.md` is for **you** (Claude Code) while building. Keep the content each audience needs in its own file. Don't merge them.

## 5. Commands

Define these as `package.json` scripts in Phase 1 and keep this table accurate:

| Task | Command |
|---|---|
| Install | `pnpm install` |
| Dev server | `pnpm dev` (pin clock: `DEMO_NOW=2026-10-25T09:30:00+05:30`) |
| Firestore emulator | `pnpm emulators` (then `DATA_BACKEND=firestore FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`) |
| Lint / typecheck | `pnpm lint` / `pnpm typecheck` |
| Unit tests | `pnpm test` (impact-selected: `pnpm test:changed`; tier-2 coverage: `pnpm test:coverage`) |
| E2E | `pnpm e2e` (needs `pnpm build` first) |
| Personas (all / one) | `pnpm personas` / `pnpm exec playwright test --project=kamla` |
| Build | `pnpm build` |
| i18n parity | `pnpm i18n-check` |
| Flow YAML rules | `pnpm flow-lint` |
| SCI report | `pnpm sci --dry-run` (needs GitLab API env) |
| Merge gate (dry run) | `pnpm gate --dry-run` (needs MR env) |
| Other CI scripts | `pnpm policy-check`, `carbon-gate`, `trust`, `chaos-guard --env production`, `pii-scan`, `canary-watch`, `release`, `incident`, `diary`, `audit`, `chaos-score` |
| Terraform | `cd infra/terraform && tofu fmt -check && tofu validate && tofu plan` (`terraform` works too) |
| CI lint | Validate `.gitlab-ci.yml` with `glab ci lint` (or the CI Lint API) before pushing |

## 6. Non-negotiable engineering rules

1. **Deterministic things stay deterministic.** Rollback, merge decisions, persona checks, SCI math, carbon gate, PII scan: plain code, no LLM. Agents *explain* and *fix*; scripts *decide* and *enforce*.
2. **Agents never merge, never deploy to prod directly, never roll back by themselves.** The merge gate CI job merges (with `AUTOPILOT_MERGE_TOKEN`). Pipelines deploy. `canary-watch` + `rollback` jobs roll back.
3. **Forbidden paths** for agent MRs (enforced by the merge gate → label `needs-human`, never auto-merged): `.autopilot/**`, `LICENSE`, security policy files, CI files that remove or weaken jobs. Agents may *propose* CI optimisations (Green Steward), but those MRs need a human.
4. **Tier 2 minimum checks can never be lowered** by trust score, carbon mode, or anything else.
5. **Chaos only targets staging.** `scripts/chaos-guard` must hard-fail if any chaos variable/flag reaches the `production` environment.
6. **Never fake human events.** Don't use a personal access token to make bot actions look human so triggers fire. See PRD §8.3 for the allowed loop-wiring ladder.
7. **Least-privilege toolsets** for every flow. Document agent → tools → reason in `docs/agents.md`.
8. **No secrets in the repo.** Use masked CI variables, Secret Manager, and WIF. Secret Detection runs on every MR.
9. **Accessibility is a build requirement**, not polish: ≥ 48px targets, ≥ 18px body text, AAA contrast on key text, full keyboard path, all strings translated. This also applies to Mission Control.
10. **`main` must always be demoable.** Small MRs, green pipelines, no half-finished features merged without a flag.

## 7. Writing GitLab Duo custom flow YAML (critical; read every time)

Source: GitLab docs, Flow Registry v1 + custom flow schema (docs v19.6). Verify against the live docs if something fails.

- Top level: `version: "v1"`, `environment: ambient` (**only `ambient` is allowed in custom flows**), `components`, `routers`, `flow`, `prompts`. Optional `coding_environment: full|none` (`none` for API-only flows: faster, cheaper).
- **Not allowed in custom flows:** top-level `name`/`description`/`product_group`; `model` inside prompts; `response_schema_id`/`response_schema_version`; `stop` in params; `ui_role_as` on OneOffComponent.
- Components: `AgentComponent` (multi-turn + tools), `OneOffComponent` (single round + tools, retries), `DeterministicStepComponent` (one tool, no LLM), `HumanInputComponent` (**don't use it in the hands-off path**). Terminate with `end` or `abort`.
- Names: no `:` or `.` in component names.
- Every inline prompt **must** have `unit_primitives: []` and `placeholder: history`.
- Every system prompt **must** end with an explicit stop instruction: "When X, your final answer is Y. No further steps are needed after that."
- Any component calling GitLab API tools **must** take `context:project_id` as `project_id` and include `Project ID: {{ project_id }}` in the `user:` block.
- **Never write `{{ }}` in system prompt text** unless it's a real input variable (Jinja renders it; a stray one crashes the session).
- The `as:` alias in `inputs` must exactly match the `{{ variable }}` in the prompt.
- No response schemas → **when an agent's output drives a conditional router, the prompt must force the final answer to be exactly one keyword** (`APPROVE` / `CHANGES`, `PASS` / `FAIL`) and the router must include a `"default_route"` key **inside `condition.routes`** (a `default_route` sibling of `condition` is rejected by the schema).
- Add `flow.inputs` with `agent_platform_standard_context` when you need `primary_branch`, `workload_branch`, or `session_owner_id`.
- `context:goal` format depends on the trigger: Mention = `Input: …\nContext: {Issue IID: N}`; Assign = URL **or** IID (handle both); MR/Work item = `Context:\n<Type>: <url>\nAction: <action>`; Pipeline = **full webhook JSON**. Prompts must parse defensively.
- Supervisor mode: `subagents` + `max_delegations` (always set a cap) and every sub-agent needs `description`.
- Use `ui_log_events: ["on_agent_final_answer","on_tool_execution_success","on_tool_execution_failed"]` so sessions are visible (judges look at these).
- There is **no merge tool**. Don't try to merge from a flow.
- Keep each flow file in `.gitlab/duo/flows/<name>.yaml` and record its AI Catalog ID + triggers in `docs/agents.md`. When you change YAML, tell Yash it must be re-pasted/updated in **AI → Flows** (the UI copy is what runs).

Minimal template to start from:

```yaml
version: "v1"
environment: ambient
components:
  - name: "triage_agent"
    type: AgentComponent
    prompt_id: "triage_prompt"
    model_size_preference: "small"
    inputs:
      - from: "context:goal"
        as: "goal"
      - from: "context:project_id"
        as: "project_id"
    toolset: ["get_issue", "update_issue", "gitlab_issue_search", "create_issue_note"]
    ui_log_events: ["on_agent_final_answer", "on_tool_execution_success", "on_tool_execution_failed"]
prompts:
  - prompt_id: "triage_prompt"
    name: "Triage"
    unit_primitives: []
    prompt_template:
      system: |
        You are the Triage agent for an elderly-care medicine reminder app.
        Read AGENTS.md rules. ...
        When the issue has labels, a risk tier, acceptance criteria and a persona
        test plan, your final answer is a one-line summary. No further steps are needed after that.
      user: |
        Project ID: {{ project_id }}
        Trigger context: {{ goal }}
      placeholder: history
    params:
      timeout: 180
routers:
  - from: "triage_agent"
    to: "end"
flow:
  entry_point: "triage_agent"
```

**Trigger reality (PRD §5.2, §8.3):** triggers fire only on **human** actions. Bot/service-account/flow actions never trigger flows, except official chain triggers (work item status set on session finish, if enabled). Design every hand-off with this in mind, and follow the loop-wiring decision recorded in `docs/adr/0001-loop-wiring.md`.

## 8. CI/CD conventions
- Stages (PRD §8.5): `.pre → build → test → personas → secure → package → review → verify-live → deploy → release → govern → .post`.
- Use `rules:` (not `only/except`). Every job declares `rules` with `changes:` where it makes sense (carbon savings are a judged feature).
- `interruptible: true` on MR jobs; cache the pnpm store, Playwright browsers, and the Next build cache.
- Job names are stable and prefixed by stage (`persona:kamla`, `deploy:canary-prod`). Mission Control and the SCI script parse them.
- Emit **JUnit** reports for tests/personas so GitLab shows them in the MR.
- Every deploy job uses a GitLab **environment** (`review/*`, `staging`, `production`).
- GCP auth only via `id_tokens` + Workload Identity Federation.
- Include GitLab templates: `Jobs/SAST.gitlab-ci.yml`, `Jobs/Secret-Detection.gitlab-ci.yml`, `Jobs/Dependency-Scanning.gitlab-ci.yml`, `Jobs/Container-Scanning.gitlab-ci.yml` (+ DAST if the tier allows). Check current template paths in the docs before using them.
- Validate the YAML before every push (`glab ci lint` or the CI Lint API).

## 9. Code conventions
- TypeScript strict, no `any` without a comment explaining why.
- `lib/schedule/` and `lib/doses/` are pure functions, store UTC, display IST, 100% branch coverage, plus property-based tests (fast-check) for dose-time maths.
- All user-facing strings come from `messages/*.json`. **Adding a key means adding it to `en`, `hi`, and `pa` in the same commit.** If you're unsure of a Hindi/Punjabi translation, write your best version and add the key to `docs/i18n-review.md` for Yash to check. Never leave English in `hi`/`pa`.
- Components: semantic HTML first, ARIA only when needed, visible focus styles, min target 48px.
- Logging: structured JSON, **no PII** (the PII scan will fail the pipeline).
- Small, focused commits with conventional commit messages (`feat:`, `fix:`, `ci:`, `docs:`, `infra:`, `agents:`).

## 10. How to work on a task
1. Read the relevant PRD section (feature IDs F1–F16).
2. Check the current phase (PRD §11). Don't jump ahead if an earlier phase is not green, unless Yash asks.
3. Plan briefly. For anything touching tier-2 paths, CI, infra, or flow YAML, state the plan before editing.
4. Implement with tests. Run `pnpm lint && pnpm typecheck && pnpm test` and the relevant personas locally.
5. For CI changes: lint the YAML. For Terraform: `fmt`, `validate`, `plan`.
6. Update docs that the change affects (`docs/agents.md`, `docs/sustainability.md`, README, this file's command table).
7. Report back briefly: what changed, how it was verified, and anything Yash must do by hand in the GitLab UI (for example "paste updated `healer.yaml` into AI → Flows" or "add CI variable X").

## 11. Things only Yash can do (ask, don't guess)
- Creating/enabling flows, triggers, and service accounts in the GitLab UI; group/project settings; policies
- GCP project creation, billing, enabling APIs, first Terraform bootstrap of WIF
- CI/CD variables and tokens (`AUTOPILOT_MERGE_TOKEN`, GCP project/WIF IDs, Speech API settings)
- Choosing the project name and app name
- Recording the video and filling the Devpost form

When a task needs one of these, stop and list the exact steps for Yash.

## 12. Definition of done (per feature)
- Works end-to-end on the real GitLab project and leaves a **visible trace** (MR comment, job, artifact, release, incident, or Mission Control panel)
- Tests and personas green; pipeline green on `main`
- Docs updated; no secrets, no PII, no non-OSI deps
- If it's demo-relevant, add the pipeline/MR/issue URL as evidence in `docs/demo-script.md`

## 13. Final-day checklist (before 13:00 UTC Oct 27)
- [ ] `LICENSE` (MIT) shows in the GitLab About section; repo is **public**
- [ ] README: what/why/how, architecture diagram, how to run, live URLs, Mission Control URL, synthetic-data notice
- [ ] Pipeline history shows multiple full hands-off runs, a chaos → heal run, and a rollback
- [ ] Live app + Mission Control publicly reachable on Cloud Run; deployment code in repo (GCP bonus)
- [ ] `docs/sustainability.md` has the SCI methodology, cited coefficients, uncertainty bounds, and the before/after table
- [ ] Video < 3 min on YouTube (public/unlisted), narrated, no copyrighted music, no third-party trademarks
- [ ] Devpost form complete (+ Environmental opt-in text)
- [ ] **Then freeze.** Further work only in a fork.
