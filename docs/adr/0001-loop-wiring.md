# ADR 0001: Loop wiring (how non-human events start flows)

Status: **Proposed. Phase 0 spikes not yet run.** Yash must verify each row in the hackathon group and update this file.

## Context

GitLab Duo flow triggers fire only on human actions. Bot, service-account and flow actions never start a flow, except official chain triggers (feature flags `ai_flow_trigger_status_on_finish` + `ai_flow_trigger_chaining`). PRD §5.2, §8.3. We will not use a personal token to make bot events look human.

## Decision (per hand-off, first rung that works on the PRD §8.3 ladder)

| Hand-off | Event | Preferred | Fallback | Status |
|---|---|---|---|---|
| Human → Triage | Issue created by a human | Work item Created trigger | Mention | expected to work |
| User report → Triage | Issue created by the app's bot token | — (bot event cannot trigger) | Rung 6: Yash assigns/mentions once; or Rung 4 Duo CLI from a relay job | **verify** |
| Triage → Builder | Triage sets status "Ready for dev" | Rung 2 chain trigger (Work item Status changed) | Rung 6: Yash assigns the Builder | **verify flags** |
| Builder MR → Reviewer, Sentinel | MR created by Builder's service account | — | Rung 2 if MR chain is available; else the merge gate waits up to 20 min, then blocks with a clear table; Yash adds the reviewer (one action) | **verify** |
| Failed MR pipeline | Bot pipeline | Rung 1: Builder self-verifies (lint, types, unit, build, personas) before pushing | Foundational "Fix CI/CD Pipeline" flow by mention | by design |
| Canary breach | `deploy:canary-watch` fails | Rung 1: deterministic `deploy:rollback` + incident (no flow needed) | — | by design |
| Incident → Healer | Incident opened by CI | Rung 3 if Pipeline Failed fires for human-owned pipelines | Rung 6: Yash mentions the Healer on the incident | **verify** |
| Synthetic monitor → Healer | Scheduled pipeline owned by Yash fails | Rung 3: Pipeline events (Failed) trigger, goal = webhook JSON | Rung 6 | **verify** |
| Healer → Scribe | Healer finishes | Rung 2 chain status | Mention | **verify** |
| Chaos | Human mention `@chaos unleash` | Mention trigger (human) | — | expected to work |
| Release → Herald | Tag by pipeline | Deterministic notes from the MR's "Caregiver notes" (always) | Herald by mention for richer notes | by design |

The important property: **everything that decides or enforces is deterministic CI and never needs a trigger** (merge gate, rollback, incident creation, release, trust, SCI, audit). Only the *agentic* steps need wiring, and every rung we fall back to is a single, visible human action, presented honestly in the video.

## Phase 0 checklist (Yash)

- [ ] Can you create custom flows and triggers in the hackathon project (Maintainer)?
- [ ] Which trigger types are offered? Are chain triggers enabled?
- [ ] Does a pipeline from a schedule you own fire a Pipeline-events trigger?
- [ ] What username prefix do flow service accounts get? The merge gate trusts verdict notes only from `agent_prefix` in `.autopilot/policy.yml` (currently `ai-`).
- [ ] Credits used by one Triage and one Builder session.
- [ ] Do CI-run flows have `run_command` and file tools? Does `agent-config.yml` apply?
