# Redesign Orient + Show Output: Whole-Picture, No Clustering

## Goal

Redesign `chitkingOrient` and `chitkingShow` CLI output to match the whole-picture style applied to the plugin breadcrumb. Replace flat metadata + clustered sections with a unified flow: stage progression → readiness context → maturity → issues (compact) → next steps.

## Problem

Current `chitkingOrient` output is verbose and clustered:
```
Active thread: <slug>
Stage: <stage>
Maturity: <maturity>
Readiness: <readiness> (<source>)

Warnings / blockers:
- ...

Allowed-but-risky roles:
- ...

Recommended next safe actions:
- ...

Recovery options if stuck:
- ...
```

This has 4 separate sections, flat metadata, no stage progression visualization, and no clear focus on "where am I and what next."

## Requirements

### 1. Redesign `chitkingOrient` output

New format (matches breadcrumb style):
```
Thread: <slug>
Title: <title>

Stages: [seed] briefed → gap-identified → specified → verification-planned → implementation-ready → evidence-recorded → synthesis-ready → (loop)

Readiness: 1/5 — need ≥1 to advance to briefed ✓ ready
Maturity: nascent (whole-thread quality)

Issues:
- research/project.md appears incomplete.

Next steps:
- chitking assess — evaluate content against stage criteria
- chitking step --to briefed --reason "..." — advance to next stage
- chitking dispatch — refresh role packets
```

Key changes:
- **Stage progression line** — all stages with current in `[brackets]`, `→ (loop)` suffix (same as breadcrumb).
- **Readiness with context** — `X/5` with threshold, next stage, ✓/✗ indicator.
- **Maturity** — label + `(whole-thread quality)`.
- **"Issues:"** — compact list of actual problems (missing sections, stale packets, incomplete project, dirty tree, unrecorded commits). If none, print `None.` One-liner per issue, no section headers.
- **"Next steps:"** — unified action list. Merges what was "Recommended next safe actions" + "Recovery options." Each line is `command — description`.
- **Remove "Allowed-but-risky roles:"** — this was the worst offender for clustering. Role-specific warnings are already in dispatch packets and role-context injection. Orient is about the thread, not role gating.
- **Remove flat "Stage: X / Maturity: Y / Readiness: Z" lines** — replaced by progression + readiness context.

### 2. Redesign `chitkingShow` output

Current:
```
Thread: <slug>
Title: <title>
Stage: <stage>
Maturity: <maturity>
Readiness: <readiness> (<source>)
Archived: no
Updated: <timestamp>
Thread file: <path>
Context cache: <path>
```

New:
```
Thread: <slug>
Title: <title>

Stages: [seed] briefed → ... → synthesis-ready → (loop)
Readiness: 1/5 — need ≥1 to advance to briefed ✓ ready
Maturity: nascent

Archived: no | Updated: <timestamp>
Thread file: <path>
Context cache: <path>
```

Add stage progression + readiness context. Keep file paths. Merge Archived + Updated into one line.

### 3. Update tests

- `test/commands/chitking.test.ts` — update orient/show assertions for new format.
- Verify the orient test no longer checks for "Warnings / blockers:", "Allowed-but-risky roles:", etc.

## Acceptance Criteria

* [ ] `chitkingOrient` shows stage progression line with `[brackets]` + `→ (loop)`.
* [ ] `chitkingOrient` shows readiness as `X/5` with threshold + ✓/✗.
* [ ] `chitkingOrient` has compact "Issues:" section (not "Warnings / blockers:").
* [ ] `chitkingOrient` has unified "Next steps:" (not split sections).
* [ ] `chitkingOrient` no longer has "Allowed-but-risky roles:" section.
* [ ] `chitkingShow` shows stage progression + readiness context.
* [ ] `pnpm build && pnpm test && pnpm lint && pnpm typecheck` pass.
* [ ] `git diff --check` clean.
* [ ] Version bumped.

## Out of Scope

* Plugin breadcrumb changes (already done).
* Role-context (`buildRoleContext`) changes (stays verbose by design).
* `chitkingList` format changes.
* `chitkingAssess` format changes (already has its own format).
* New data — just reformatting existing output.

## Technical Notes

* Both functions are in `src/commands/commands.ts` (~line 406 for show, ~519 for orient).
* Reuse the same formatting logic from the plugin's `buildActiveDirective` — extract shared helpers for stage progression and readiness context if practical.
* The `config` object has `stages` and `stage_advancement` — use them for progression + threshold.
* `roleRiskWarnings`, `findStalePackets`, `readGitSnapshot`, `projectLooksIncomplete` are still called but their output is compacted into "Issues:" instead of separate sections.
