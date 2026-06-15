# Circular Maturity Model: Stage/Readiness/Maturity Redesign

## Goal

Replace the linear `maturity_ladder` model with a circular research lifecycle. Rename the current `maturity` frontmatter field to `stage` (position on the circle), repurpose `readiness` as a per-stage gate that resets on each `step`, and introduce a new `maturity` field that evaluates the whole thread holistically. `step` at the final stage loops back to the first stage instead of erroring.

This is the foundation task. Follow-up tasks (assess, iterate, always-active plugin) depend on it.

## Requirements

* Rename frontmatter `maturity` → `stage` (values unchanged: seed, briefed, gap-identified, specified, verification-planned, implementation-ready, evidence-recorded, synthesis-ready).
* Add new frontmatter `maturity` field with whole-thread semantics: nascent → developing → established → mature. Defaults to `nascent` on new threads.
* Repurpose `readiness`: per-stage gate (1-5). Resets to 1 on every `step` (forward or loop-back).
* `chitkingStep`: at the final stage (`synthesis-ready`), stepping loops back to `seed` instead of erroring. Appends a cycle marker to "Decisions & Maturity History" (e.g., `cycle 1 complete; looped synthesis-ready→seed`).
* Config schema: `maturity_ladder` → `stages`; `readiness_thresholds` renamed to `stage_advancement` (threshold to advance FROM each stage); role `min_maturity` → `min_stage`; add `maturity_levels: [nascent, developing, established, mature]`.
* All role gates check `frontmatter.stage` against `min_stage` (was `frontmatter.maturity` against `min_maturity`).
* Plugin breadcrumb reads `stage` and `maturity` from frontmatter; displays both.
* Demo fixture migrated to new frontmatter.
* Backward compat: `chitkingStep` and frontmatter readers handle old `maturity:` key gracefully by treating it as `stage:` (one-time migration warning printed, not an error).

## Acceptance Criteria

* [ ] `config.yaml` template uses `stages`, `stage_advancement`, `min_stage`, `maturity_levels`.
* [ ] New threads get `stage: seed`, `maturity: nascent`, `readiness: 1` in frontmatter.
* [ ] `chitking step` at `synthesis-ready` loops to `seed` + resets readiness to 1 + logs cycle completion in history.
* [ ] `chitking step` at any non-final stage advances forward + resets readiness to 1.
* [ ] Role gate warnings reference `stage` not `maturity` (e.g., "stage seed is before role minimum briefed").
* [ ] Plugin breadcrumb shows `Stage: <stage>` and `Maturity: <maturity>` (separate lines).
* [ ] Old frontmatter with `maturity: seed` (no `stage:` key) is read correctly as `stage: seed`, with a one-time migration notice.
* [ ] `pnpm build && pnpm test && pnpm lint && pnpm typecheck` all pass.
* [ ] `git diff --check` clean.

## Definition of Done

* Tests updated to cover: stage rename, loop-back step, readiness reset, backward compat reader, new `maturity` field default.
* Config schema + types updated.
* Demo fixture migrated.
* Plugin template updated (breadcrumb shows new fields).
* Version bumped before `feat:` commit (`pnpm version:bump`).

## Out of Scope

* `chitking assess` command (heuristic content evaluation) — follow-up task.
* `chitking iterate` command (supersede/archive+new) — follow-up task.
* Always-active plugin directive (`buildActiveDirective`) — follow-up task.
* Hash-based file reload — follow-up task.
* Codex adapter changes — OpenCode plugin only.
* Migration script for existing user repos (backward-compat reader is sufficient for v0.0.x).

## Technical Notes

### Files to change

* `src/commands/chitking.ts` — core: rename `maturity_ladder`→`stages` in types + config parsing, `frontmatter.maturity`→`frontmatter.stage` everywhere, add `frontmatter.maturity` (new holistic field), role gate `min_maturity`→`min_stage`, `chitkingStep` loop-back logic + readiness reset, `chitkingNew` adds `maturity: nascent` to frontmatter, backward compat reader for old `maturity:` key.
* `src/cli/chitking.ts` — update help text / option descriptions referencing "maturity".
* `src/templates/chitking/config.yaml` — rename keys, add `maturity_levels`.
* `src/templates/chitking/skills/chitking-workflow.md` — update terminology.
* `src/templates/chitking/commands/ck-*.md` — update references.
* `src/templates/opencode/plugins/inject-chitking-context.js` — breadcrumb reads `stage` + `maturity`, role gates use `min_stage`.
* `demo/research/contact-stability/thread.md` — frontmatter migrated.
* `test/commands/chitking.test.ts` — update all `maturity` assertions to `stage`, add new tests (loop-back, readiness reset, backward compat, maturity field default).
* `test/demo/demo.test.ts` — update if frontmatter assertions exist.
* `README.md` — update terminology if it references maturity model.

### Key semantics

* **Stage** = position on the circle. Values: seed, briefed, gap-identified, specified, verification-planned, implementation-ready, evidence-recorded, synthesis-ready. Circular: after synthesis-ready, next is seed.
* **Readiness** = per-stage gate (1-5). Meaning: "how ready to advance to next stage." Resets to 1 on every step.
* **Maturity** = whole-thread holistic quality. Values: nascent, developing, established, mature. Changed only by humans (or future `assess` command), NOT by `step`.

### Backward compat

Old frontmatter: `maturity: seed`. New frontmatter: `stage: seed, maturity: nascent`. Reader logic:
1. If `stage:` key exists → use it.
2. If only `maturity:` key exists → treat as `stage:`, set `maturity: nascent`, print one-time notice: "Migrating frontmatter: maturity→stage. Run chitking show to verify."
3. `chitkingStep` and `chitkingShow` always read via the compat reader.

### Config schema diff

```yaml
# OLD                              # NEW
maturity_ladder:                   stages:
  - seed                             - seed
  - briefed                          - briefed
  ...                                ...
readiness_thresholds:              stage_advancement:
  seed: 1                            seed: 1
  briefed: 1                         briefed: 1
  ...                                ...
                                   maturity_levels:
                                     - nascent
                                     - developing
                                     - established
                                     - mature
roles:                             roles:
  plan:                              plan:
    min_maturity: briefed               min_stage: briefed
```
