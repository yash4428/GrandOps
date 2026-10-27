# Demo script (< 3 min) and evidence

Follows PRD §12. Record from real runs only. Fill the evidence table as runs happen.

## Evidence links

| Moment | Link |
|---|---|
| First full hands-off run (issue → prod) | _TBD issue / MR / pipeline_ |
| Triage flow auto-run on issue create (labels, tier 2, acceptance criteria, persona plan) | [work_items/2](https://gitlab.com/gitlab-ai-hackathon/transcend-october-2026/43704625/showcase/-/work_items/2) |
| Green `main` pipeline: 25 jobs incl. 5 personas, security scans, SBOM, SCI | [pipelines/2993034555](https://gitlab.com/gitlab-ai-hackathon/transcend-october-2026/43704625/showcase/-/pipelines/2993034555) |
| Kamla fails on a 32px button, Builder fixes it | _TBD_ |
| Sentinel finds and fixes a vulnerable dependency | _TBD_ |
| Canary breach → rollback → incident | _TBD_ |
| Chaos round: attack → detect → heal | _TBD_ |
| Scribe lesson in AGENTS.md, later MR cites it | _TBD_ |
| Punjabi voice report → triaged issue | _TBD_ |
| Release with EN/HI/PA notes | _TBD_ |
| `needs-human` exception (agent touched CI/policy) | _TBD_ |
| SCI before/after table | `docs/sustainability.md` |

## Recipes

**Break prod on purpose (rollback demo):** merge an MR that makes `/healthz` slow or erroring only when `APP_ENV=production` would be dishonest; instead use a real regression, e.g. an MR adding a 2 s server delay to `/` (p95 SLO is 1.5 s). The canary watch fails, rollback runs, incident opens.

**Chaos round:** comment `@<chaos-flow> unleash tiny_buttons` on any issue. Branch `chaos/round-N-tiny_buttons` deploys the attack to staging; `chaos:detect` fails (Kamla); `chaos:heal` restores staging; `chaos:record` closes the round; scoreboard updates.

**Vulnerable dependency:** MR pinning an old version of a package with a known advisory; Sentinel should bump it.

**Synthetic 32px button:** MR changing `--target` in `app/globals.css` to `32px`.
