# Improve Plugin Breadcrumb: Whole-Picture Stage/Readiness/Maturity Visualization

## Goal

Redesign the plugin's `buildActiveDirective` output to give the agent the whole picture: all stages with current highlighted, readiness with threshold context (X/5, ready/not-ready), maturity as a clear label, and a unified "where we are + what to do next" flow — no clustering by warnings/risky sections.

## Requirements

### New breadcrumb format

Replace the current flat metadata line (`Stage: X | Maturity: Y | Readiness: Z`) with a visual progression:

```
<chitking-breadcrumb>
Thread: <slug>

Stages: [seed] briefed → gap-identified → specified → verification-planned → implementation-ready → evidence-recorded → synthesis-ready → (loop)

Readiness: 1/5 — need ≥1 to advance to briefed ✓ ready
Maturity: nascent

Next: <stage-specific directive text>

⚠️ thread.md changed since last turn — re-read before acting.

Safety: hash-check before writing to thread.md; humans own stage/readiness/maturity transitions.
</chitking-breadcrumb>
```

### Design details

1. **Stage progression line** — All stages from `config.stages`, current stage in `[brackets]`, arrows between stages, `→ (loop)` at the end to indicate circularity. One line.

2. **Readiness with context** — `X/5` format. Compare against `config.stage_advancement[currentStage]` to determine ready/not-ready. Show the threshold and next stage name:
   - Ready: `Readiness: 3/5 — need ≥3 to advance to specified ✓ ready`
   - Not ready: `Readiness: 1/5 — need ≥3 to advance to specified ✗ not ready`
   - At final stage: `Readiness: 5/5 — ready to loop back to seed ✓`

3. **Maturity** — Just the level name with a parenthetical: `Maturity: developing (whole-thread quality)`. No progression visualization (maturity is holistic, not linear).

4. **"Next:" prefix** — The directive text is prefixed with `Next:` for clarity. If `CHITKING_PROACTIVE=0`, omit the directive but keep everything else.

5. **Hash warnings** — Same as current (per-file `⚠️` lines), just placed naturally in the flow.

6. **Safety footer** — Brief one-liner. No clustering.

7. **No warnings/risky roles section** — The breadcrumb is about orientation + next action. Role-specific warnings stay in the `tool.execute.before` role-context injection (unchanged).

### Missing-state breadcrumb (unchanged)

When no active thread exists, keep the current format:
```
<chitking-breadcrumb>
Chitking repo detected. No active Chitking thread...
Safe next action: inspect research/project.md, then create/focus a thread.
</chitking-breadcrumb>
```

## Acceptance Criteria

* [ ] All stages shown in one line with current in `[brackets]` and `→ (loop)` suffix.
* [ ] Readiness shown as `X/5` with threshold, next stage name, and ✓/✗ ready indicator.
* [ ] Maturity shown as label with `(whole-thread quality)` parenthetical.
* [ ] Directive prefixed with `Next:`.
* [ ] No clustering by warnings/risky sections.
* [ ] `CHITKING_PROACTIVE=0` still works (omits directive, keeps everything else).
* [ ] Hash warnings still fire in natural flow position.
* [ ] `tool.execute.before` (role context) unchanged.
* [ ] `pnpm build && pnpm test && pnpm lint && pnpm typecheck` pass.
* [ ] `git diff --check` clean.
* [ ] Version bumped (this is a `feat:` — meaningful UX change).

## Out of Scope

* Role-context (`buildRoleContext`) output format changes.
* `chitking orient` CLI output format changes.
* Config-customizable stage labels.
* Color/emoji in the breadcrumb (plain text for portability).

## Technical Notes

* Plugin at `src/templates/opencode/plugins/inject-chitking-context.js`, function `buildActiveDirective` (~line 367).
* `loadChitkingState` already returns `config` with `stages`, `stage_advancement`. Reuse.
* Tests at `test/templates/plugin.test.ts` — update assertions for new format.
* Version bump: `pnpm version:bump` (0.0.4 → 0.0.5).
