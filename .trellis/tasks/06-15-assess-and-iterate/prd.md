# Assess and Iterate: Content Evaluation + Supersede Command

## Goal

Two new commands that build on the circular maturity model:

1. **`chitking assess`** — Heuristic content evaluation that reads the active thread body, checks structural criteria against stage-advancement and maturity-level thresholds, and prints a recommendation. Does NOT auto-apply changes (humans own maturity/readiness). The human then runs `chitking step` to apply.

2. **`chitking iterate <new-title>`** — Supersede operation: archive the active thread + create a new thread in one step, carrying forward a predecessor reference. Enables the cycle-end workflow ("archive or start new threads or iterate").

## What I already know

* `chitkingStep` (src/commands/chitking.ts:1371) advances stage + resets readiness. Never reads body content. Has loop-back at final stage.
* `chitkingArchive` (line 1228) sets `archived: true`, clears active thread. Simple flag.
* `chitkingNew` (line 1063) creates a new thread with empty section headers.
* Thread body sections: Theory Brief, Current Claim, Capability Gap, Verification Obligations, Evidence, Failed Paths, Next Safe Actions, Decisions & Maturity History (src/commands/chitking.ts:98).
* Config now has: `stages`, `stage_advancement`, `maturity_levels`, roles with `min_stage`/`min_readiness`.
* Chitking is a file-system tool — no LLM. Assessment must be heuristic/structural (section presence, word counts, bullet counts).
* Product doctrine: "humans own maturity/readiness transitions." Assess recommends; human applies.

## Assumptions (temporary)

* Assessment criteria are configurable in `config.yaml` (per-stage readiness criteria + per-maturity-level criteria).
* `iterate` creates a fresh thread at `seed`/`nascent`/`readiness:1` — no content is auto-copied from the predecessor (the researcher decides what to carry forward).
* Both commands are recommend/print-only or structural; neither auto-mutates maturity/readiness.

## Decisions

* **Q1 (assess criteria location):** Config.yaml. Add `stage_criteria` and `maturity_criteria` sections to config.yaml. Each stage/maturity level has named checks (`non-empty`, `min-bullets:N`, `min-words:N`, `history_contains:"text"`). Project-customizable, no code changes needed to tune criteria.
* **Q2 (iterate semantics):** Predecessor reference only. New thread gets `predecessor: <old-slug>` in frontmatter + "Decisions & Maturity History" entry: `Iterated from <old-slug> (archived).` Body starts empty. Researcher decides what to carry forward.

## Converged Design

### `chitking assess [thread]`

Reads the active (or specified) thread body, evaluates structural criteria from config, prints a recommendation. Never writes.

Output format (matches orient's style):
```
Assessment for thread: <slug>

Stage: <stage> (readiness <readiness>, maturity <maturity>)

Stage advancement criteria (to advance from <stage>):
  ✓ Theory Brief: non-empty
  ✗ Capability Gap: empty (0 words)
→ Readiness to advance: 1/2 criteria met — not ready to step

Maturity criteria:
  ✓ Theory Brief: ≥20 words (35 found)
  ✗ Evidence: ≥3 bullets (0 found)
→ Maturity recommendation: developing (1/2 criteria for 'developing' met)
→ To apply: edit thread.md frontmatter `maturity: developing`

Suggested next actions:
  - chitking record --type evidence --text "..."
  - Fill Capability Gap section to advance readiness
```

### `chitking iterate <new-title> [--slug <slug>] [--no-dispatch]`

Archives the active thread + creates a new one. Steps:
1. Resolve active thread slug
2. Archive it (`archived: true`)
3. Create new thread with `predecessor: <old-slug>` in frontmatter
4. Seed "Decisions & Maturity History" with: `Iterated from <old-slug> (archived).`
5. New thread becomes active
6. Auto-dispatch (unless `--no-dispatch`)
7. Print: `Iterated: <old-slug> → <new-slug>`

### Config additions (config.yaml)

```yaml
stage_criteria:
  seed:
    - { section: "Theory Brief", check: non-empty }
    - { section: "Current Claim", check: non-empty }
  briefed:
    - { section: "Capability Gap", check: non-empty }
  gap-identified:
    - { section: "Verification Obligations", check: min-bullets, value: 1 }
  specified:
    - { section: "Next Safe Actions", check: min-bullets, value: 1 }
  verification-planned:
    - { section: "Verification Obligations", check: min-words, value: 20 }
  implementation-ready:
    - { section: "Next Safe Actions", check: min-words, value: 20 }
  evidence-recorded:
    - { section: "Evidence", check: min-bullets, value: 2 }
  synthesis-ready:
    - { section: "Evidence", check: min-bullets, value: 3 }
    - { section: "Failed Paths", check: non-empty }

maturity_criteria:
  developing:
    - { section: "Theory Brief", check: min-words, value: 20 }
    - { section: "Current Claim", check: non-empty }
  established:
    - { section: "Evidence", check: min-bullets, value: 3 }
    - { section: "Failed Paths", check: non-empty }
  mature:
    - { history_contains: "cycle complete" }
```

Supported check types:
- `non-empty`: section has any non-whitespace text after the header
- `min-bullets`: section has ≥ N bullet points (lines starting with `-`)
- `min-words`: section body has ≥ N words
- `history_contains`: "Decisions & Maturity History" section contains the given text

## Requirements (evolving)

* `chitking assess` reads the active thread body, evaluates per-stage readiness and whole-thread maturity against heuristic criteria, and prints a recommendation.
* `chitking iterate <new-title>` archives the active thread and creates a new one with a predecessor link.
* Neither command auto-applies maturity/readiness changes.
* Tests added for both commands.
* Version bumped before `feat:` commit.

## Acceptance Criteria

* [ ] `chitking assess` prints pass/fail per stage criterion + readiness recommendation + maturity recommendation + suggested actions.
* [ ] `chitking assess` on a thread missing all criteria says "not ready" with actionable suggestions.
* [ ] `chitking assess [thread]` works on non-active threads too.
* [ ] `chitking iterate <title>` archives old thread + creates new + adds `predecessor` frontmatter field + seeds history + switches active + auto-dispatches.
* [ ] `chitking iterate --no-dispatch` skips dispatch.
* [ ] Config `stage_criteria` and `maturity_criteria` parsed and validated; unknown check types error.
* [ ] Neither command writes maturity/readiness directly.
* [ ] `pnpm build && pnpm test && pnpm lint && pnpm typecheck` pass.
* [ ] `git diff --check` clean.

## Definition of Done

* Tests for assess (pass/fail criteria, recommendation output, missing-thread error).
* Tests for iterate (archive+new, predecessor field, active thread switch).
* Config schema updated if criteria are configurable.
* Version bumped.

## Out of Scope

* LLM-based content quality evaluation (only structural heuristics).
* Auto-applying maturity/readiness changes (always recommend-only).
* Always-active plugin directive (separate follow-up task).
* Hash-based file reload (separate follow-up task).

## Technical Notes

* Assessment heuristics are structural: section non-empty, section has ≥N bullets, section has ≥N words, specific markers present.
* `iterate` = `chitkingArchive(activeThread, {yes:true})` + `chitkingNew(title, {}, cwd)` + add `predecessor: <oldSlug>` to new thread frontmatter.
* Config already has `maturity_levels: [nascent, developing, established, mature]` — criteria can reference these.
