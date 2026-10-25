# persona-kit

Deterministic Playwright checks modelled on elderly users. No AI calls, no network.

| Check | Persona | What it enforces |
|---|---|---|
| `checkTargetSize` | Kamla (tremor) | targets ≥ 48×48 CSS px |
| `checkTargetSpacing` | Kamla | ≥ 8px between targets |
| `checkJitterTap` | Kamla | 20 seeded jittered taps still hit the control |
| `checkReflow` | Harbans (low vision) | no horizontal scroll at 320px (WCAG 1.4.10) |
| `checkTextSize` | Harbans | text ≥ 18px |
| `checkContrast` | Harbans | key text ≥ 7:1 (AAA) |
| `missingKeys` / `checkNoEnglishLeak` / `checkScriptFont` | Rano (Punjabi only) | full catalogs, no English fallback, Gurmukhi font loaded |

Each check returns `Violation[]` with a plain-language `experience` field you can paste into an MR comment.

```ts
import { checkTargetSize } from "@autopilot/persona-kit";
expect(await checkTargetSize(page)).toEqual([]);
```

Published to the GitLab Package Registry from tags. MIT licence.
