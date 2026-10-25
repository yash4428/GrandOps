# Agents: roster, tools and why (least privilege)

Source of truth for flow YAML: `.gitlab/duo/flows/*.yaml`. The copy in **AI → Flows** is what runs: re-paste after every change. `pnpm flow-lint` checks the YAML against the custom-flow rules.

| Flow | File | Stage | Trigger (preferred → fallback) | Model | AI Catalog ID |
|---|---|---|---|---|---|
| Triage | `triage.yaml` | Plan | Work item Created (Issue) → Mention | small | _TBD_ |
| Builder (developer, tester, persona_fixer) | `builder.yaml` | Create, Verify | Status "Ready for dev" (chain) → Assign | large | _TBD_ |
| Elder-care Reviewer (+ second reviewer on tier 2) | `reviewer.yaml` | Verify | MR Created → Assign reviewer | large | _TBD_ |
| Sentinel | `sentinel.yaml` | Secure | MR Created → Mention | large | _TBD_ |
| Herald | `herald.yaml` | Release | Mention | small | _TBD_ |
| Healer | `healer.yaml` | Monitor → Plan → Create | Pipeline Failed (human-owned schedule) / Incident created → Mention | large | _TBD_ |
| Chaos | `chaos.yaml` | Monitor | Mention (human) | small | _TBD_ |
| Scribe | `scribe.yaml` | Govern | Mention / chain after Healer | small | _TBD_ |
| Green Steward | `green-steward.yaml` | Verify, Configure | Mention (weekly) | small | _TBD_ |

Also enable foundational flows: **Code Review**, **Fix CI/CD Pipeline**, **Software Development** (backup), **SAST False Positive Detection**.

The PRD's "Persona Explainer" is not a separate flow: persona checks and their plain-language MR card are fully deterministic (`persona:report` job, zero credits), and the Builder's `persona_fixer` sub-agent fixes failures before push.

## Tools per agent

| Agent | Tools | Why each is needed |
|---|---|---|
| Triage | `get_issue`, `update_issue`, `gitlab_issue_search`, `create_issue_note`, `create_work_item`, `get_repository_file` | read issue; write plan + labels; dedupe; summary note; child tasks; read AGENTS.md. No code, no MR tools. |
| Builder supervisor | `get_issue`, `update_issue`, `create_issue_note`, `create_branch`, `create_commit`, `create_merge_request`, `read_file`, `find_files`, `grep`, `run_command` | read plan; publish one MR; run checks. No merge (none exists), no security tools. |
| ↳ developer | `read_file`, `edit_file`, `create_file_with_contents`, `find_files`, `grep`, `list_repository_tree`, `get_repository_file` | edit working copy only; cannot push or run commands. |
| ↳ tester | file tools + `run_command`, `run_tests` | write and run tests. |
| ↳ persona_fixer | `read_file`, `edit_file`, `find_files`, `grep`, `run_command` | run personas, fix app code. Prompt forbids editing tests/personas. |
| Elder-care Reviewer | `get_merge_request`, `list_merge_request_diffs`, `build_review_merge_request_context`, `get_repository_file`, `create_merge_request_note`, `create_merge_request_diff_note`, `submit_mr_review` | read-only on code; can only comment and review. |
| Second reviewer | same minus `submit_mr_review`, `build_review_merge_request_context` | independent verdict via marker note. |
| Sentinel | security finding/vulnerability tools, `read_file`, `edit_file`, `run_command`, `create_commit`, `create_merge_request_note`, `get_merge_request` | triage findings; commit fixes to the MR branch; justify dismissals. |
| Herald | `gitlab_api_get`, `get_merge_request`, `create_issue_note`, `create_merge_request_note` | read release + MRs; post notes. Cannot change anything else. |
| Healer | issue tools, pipeline/job log tools, `gitlab_api_get`, file tools, `run_command`, `create_branch`, `create_commit`, `create_merge_request` | diagnose and fix forward. No deploy or rollback ability (by design). |
| Chaos | `create_issue`, `create_issue_note`, `create_branch`, `create_commit` | open a round and push a `chaos/round-*` branch. Staging-only by CI rules + chaos-guard. |
| Scribe | `get_issue`, `update_issue`, `create_issue_note`, `list_project_audit_events`, `get_job_logs`, `gitlab_api_get`, file tools, `create_branch`, `create_commit`, `create_merge_request` | postmortem + one lesson in AGENTS.md via MR (tier 2 → two reviewers). |
| Green Steward | `get_repository_file`, `list_repository_tree`, `gitlab_api_get`, `ci_linter`, `create_branch`, `create_commit`, `create_merge_request`, `create_issue_note` | propose CI savings; its MRs touch CI so the gate always labels them `needs-human`. |

## Deterministic jobs (zero credits)

`policy-check`, `carbon-gate`, `persona:*`, `persona:report`, `autopilot:merge-gate`, `deploy:chaos-guard`, `deploy:canary-watch`, `deploy:rollback`, `deploy:rollback-incident`, `release:create`, `govern:trust-update`, `govern:pii-scan`, `govern:audit-record`, `sci:report`, `monitor:*`, `diary:daily`, `chaos:*`.

## Unverified schema points (check in the flow builder)

- `subagents` entry shape (`name`, `description`, `prompt_id`, `toolset`) and how a sub-agent receives its task (`{{ goal }}` in sub-agent prompts).
- Conditional router input path `context:elder_care_reviewer.final_answer`.
- Service-account username prefix (`ai-`) used by the merge gate to trust verdict notes.
