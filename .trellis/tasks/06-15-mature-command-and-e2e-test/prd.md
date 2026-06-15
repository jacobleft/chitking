# chitking mature Command + End-to-End Lifecycle CI Test

## Goal

1. **`chitking mature --to <level> --reason "..."`** — The missing command for whole-thread maturity transitions. Models after `step` but for the holistic `maturity` field (nascent → developing → established → mature).

2. **E2E lifecycle CI test** — Automated test that simulates the full research lifecycle (init → new → fill → assess → step through stages → loop-back → mature → iterate), recording behavior at each step for inspection.

## Design decisions (from user)

* Role-context (`buildRoleContext`) stays verbose and comprehensive — no format changes there.
* E2E test should be a CI test (vitest), not manual dogfooding. Records behaviors for inspection.

## Requirements

### 1. `chitking mature` command

**CLI:** `chitking mature --to <level> [--reason <text>] [--no-dispatch]`

- `--to <level>` — Required. Target maturity level. Must exist in `config.maturity_levels`.
- `--reason <text>` — Required. Human-readable reason for the maturity change.
- `--no-dispatch` — Skip auto-dispatch (consistent with step/new/focus/iterate).

**Behavior:**
1. Resolve active thread
2. Validate `--to` against `config.maturity_levels`
3. Require `--reason` (non-empty)
4. Read thread, update `frontmatter.maturity` to target
5. Append to "Decisions & Maturity History": `maturity <old>→<new>. Reason: <reason>`
6. Update `frontmatter.updated_at`
7. Write thread
8. Auto-dispatch (unless `--no-dispatch`)
9. Print: `Maturity updated: <slug> <old> → <new>`

**Types:**
```ts
export interface MatureOptions {
  to: string;
  reason: string;
  noDispatch?: boolean;
}
```

**Exports:** `chitkingMature` + `MatureOptions` from `src/index.ts`.

### 2. E2E lifecycle CI test

**File:** `test/e2e/lifecycle.test.ts`

Simulates the full research lifecycle in a temp workspace:

```
init → new "Test Thread" → fill Theory Brief + Current Claim →
assess (expect pass/fail per criteria) →
step --to briefed --reason "brief written" →
step --to gap-identified --reason "gap identified" →
... advance through all stages ... →
step --to synthesis-ready --reason "evidence recorded" →
step (loop-back to seed) →
mature --to developing --reason "one cycle complete" →
iterate "Test Thread v2" →
verify predecessor field + archived old thread
```

**Assertions at each step:**
- Frontmatter state (stage, readiness, maturity) is correct after each command
- Readiness resets to 1 after each step
- Loop-back appends "cycle complete" to history
- Mature updates maturity and appends to history
- Iterate archives old + creates new with predecessor
- Assess prints pass/fail for criteria
- Auto-dispatch fires after step/mature/iterate (unless --no-dispatch)

**Output recording:** Use `vi.spyOn(console, 'log')` to capture all command output. After the lifecycle completes, write a summary of captured outputs to the test assertion for inspection.

**Cleanup:** `afterEach` removes temp dirs.

### 3. Supporting changes

- `src/templates/chitking/commands/ck-mature.md` — new template (match ck-step.md style)
- `src/templates/chitking/skills/chitking-workflow.md` — add mature to command list
- `src/cli/chitking.ts` — register `mature` command
- `src/index.ts` — export `chitkingMature`, `MatureOptions`
- `test/commands/chitking.test.ts` — unit tests for mature (validation, history, auto-dispatch, no-dispatch)
- `test/demo/demo.test.ts` — add `ck-mature` to EXPECTED_CK_COMMANDS
- `README.md` — add `chitking mature` to command list
- `package.json` / `src/constants.ts` — version bump (0.0.5 → 0.0.6)

## Acceptance Criteria

* [ ] `chitking mature --to developing --reason "test"` updates frontmatter.maturity
* [ ] `chitking mature` requires `--to` and `--reason` (errors if missing)
* [ ] `chitking mature` validates `--to` against `config.maturity_levels` (errors on unknown)
* [ ] `chitking mature` appends to "Decisions & Maturity History"
* [ ] `chitking mature --no-dispatch` skips dispatch
* [ ] E2E test runs the full lifecycle without errors
* [ ] E2E test verifies state at each transition
* [ ] E2E test verifies loop-back, mature, and iterate in sequence
* [ ] `pnpm build && pnpm test && pnpm lint && pnpm typecheck` pass
* [ ] `git diff --check` clean
* [ ] Version bumped

## Out of Scope

* Role-context format changes (stays verbose/comprehensive)
* `chitking orient` format changes
* Backward migration for maturity (manual edit still works)
* Config-customizable maturity criteria for `mature` command (that's `assess`'s job)

## Technical Notes

* `chitkingStep` (src/commands/chitking.ts:1487+) is the model for `chitkingMature`.
* The `MatureOptions` interface mirrors `StepOptions` structure.
* E2E test should be self-contained (creates its own temp workspace, doesn't use the demo fixture).
* The E2E test can fill thread sections by directly writing thread.md (simulating agent/human edits) between commands.
