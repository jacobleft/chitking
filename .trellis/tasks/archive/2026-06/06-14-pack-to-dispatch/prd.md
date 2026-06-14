# Rename pack to dispatch with auto-dispatch and all-roles

## Goal

Rename the `chitking pack` command to `chitking dispatch`, make it dispatch all agent roles in one invocation (instead of one role at a time), and trigger dispatch automatically after `init`, `new`, and `focus` so role packets are always fresh without a manual step.

## What I already know (from repo inspection)

- **`pack` implementation** (`src/commands/chitking.ts:1356` `chitkingPack`): takes `PackOptions { role: string }`, resolves the active thread, generates a single role packet at `research/<slug>/context/<role>.yaml`. Returns the repo path.
- **7 roles** defined in `src/templates/chitking/config.yaml`: `plan`, `dreamer`, `build`, `verify`, `synthesize`, `review`, `oracle`. Each has min_maturity, min_readiness, warnings, prompt.
- **CLI wiring** (`src/cli/chitking.ts:132-141`): `pack` command with `--role <role>` required option listing "plan, build, verify, synthesize, review, oracle".
- **`pack` name appears in**:
  - `CK_COMMANDS` array (`ck-pack`) and `CK_COMMAND_DESCRIPTIONS` (`src/commands/chitking.ts:23-63`).
  - Template `src/templates/chitking/commands/ck-pack.md`.
  - `chitkingOrient` output: `"Regenerate a role packet with: chitking pack --role <role>"` (line 1281).
  - Role contract content: `"Use the per-thread packet from \`chitking pack --role ${roleName}\`"` (line 464) and dreamer contract (line 473).
  - OpenCode adapter content: `"chitking pack --role ${roleName}"` (line 520).
  - README "Currently migrated" list and demo/README "Try it locally" (`chitking pack --role plan`).
  - Tests: `test/commands/chitking.test.ts`, `test/demo/demo.test.ts`, `test/templates/extract.test.ts` (10 pack references).
- **`init`/`new`/`focus` implementations**:
  - `chitkingInit` (line 1014): creates scaffold, sets `active.yaml` to `{ active_thread: null }`. **No active thread exists after init.**
  - `chitkingNew` (line 1046): creates thread, calls `writeActiveState(cwd, slug)` — sets active thread.
  - `chitkingFocus` (line 1117): validates thread, calls `writeActiveState(cwd, slug)` — sets active thread.
- **`resolveActiveThread`** (line 710): throws "No active Chitking thread" if none — so `dispatch` cannot run after bare `init`.
- **`ensureRoleHarness`** (line 581): already generates role contracts (`.chitking/roles/*.md`) and OpenCode adapters (`.opencode/agents/chitking-*.md`) during `init` — these are project-level, not per-thread packets.

## Decisions

- **Auto-dispatch after `init`**: skip silently if no active thread (fresh init); dispatch all roles if a thread already exists (re-init). No semantic change to init.
- **`dispatch` command**: bare `chitking dispatch` dispatches ALL roles; `--role <role>` is optional and dispatches a single role (backward-compatible escape hatch).
- **`pack` removed** (clean break) — no hidden alias. All in-repo references updated to `dispatch`.
- **Auto-dispatch set**: `init` (if active thread), `new`, `focus`, AND `step` (since maturity/readiness changes make packets stale).
- **`--no-dispatch` flag** on `new`/`focus`/`step` (and `init` for consistency) to opt out of auto-dispatch.
- **Output**: explicit `chitking dispatch` prints each packet path (one per line, scripting-friendly). Auto-dispatch (triggered by init/new/focus/step) prints a one-line summary (e.g. "Dispatched 7 role packets for <slug>.").
- **Best-effort**: all-roles dispatch continues if one role fails; collect and report failures without aborting the rest.

## Requirements

### Command rename
- Rename the CLI command `pack` → `dispatch`. Remove `pack` entirely (no alias).
- Rename `chitkingPack` → `chitkingDispatch`; `PackOptions` → `DispatchOptions { role?: string }` (role now optional).
- `chitkingDispatch`: if `role` provided → single-role packet (current behavior); if absent → loop over all `config.roles`, write each packet, return all repo paths.
- Add an internal `dispatchAllRoles` helper (best-effort loop) used by both explicit `dispatch` and auto-dispatch.
- Update `CK_COMMANDS` (`ck-pack` → `ck-dispatch`) and `CK_COMMAND_DESCRIPTIONS`.
- Rename template `src/templates/chitking/commands/ck-pack.md` → `ck-dispatch.md`; update its content (usage `chitking dispatch [--role <role>]`, steps for all-roles vs single-role).

### Reference updates (pack → dispatch)
- `chitkingOrient` output line: `chitking pack --role <role>` → `chitking dispatch [--role <role>]`.
- Role contract content (default + dreamer): `chitking pack --role X` → `chitking dispatch --role X`.
- OpenCode adapter content: same.
- README "Currently migrated" list: `chitking pack --role <role>` → `chitking dispatch`.
- demo/README "Try it locally": update the command.

### Auto-dispatch integration
- `chitkingInit`: after scaffold setup, if `readActiveThreadOrNull` returns a thread, dispatch all roles + print summary; otherwise skip silently.
- `chitkingNew`: after `writeActiveState`, dispatch all roles + print summary (unless `--no-dispatch`).
- `chitkingFocus`: after `writeActiveState`, dispatch all roles + print summary (unless `--no-dispatch`).
- `chitkingStep`: after `writeThread`, dispatch all roles + print summary (unless `--no-dispatch`).
- Add `--no-dispatch` option to init/new/focus/step CLI commands.
- Auto-dispatch summary format: `Dispatched N role packets for <slug>.` (or note if some failed).

### Tests
- Update all 10 `pack` references in `test/commands/chitking.test.ts`, `test/demo/demo.test.ts`, `test/templates/extract.test.ts` → `dispatch`.
- Add tests for: all-roles dispatch, auto-dispatch after new/focus/step, init skip-if-no-thread, `--no-dispatch` opt-out.

## Acceptance Criteria

- [ ] `chitking dispatch` generates packets for all configured roles (7 in default config).
- [ ] `chitking dispatch --role <role>` generates a single role packet.
- [ ] `chitking pack` no longer exists (errors as unknown command).
- [ ] After `new`, `focus`, `step`: all role packets auto-generated + summary printed.
- [ ] After `init` with no active thread: dispatch skipped silently.
- [ ] After `init` with an existing active thread: dispatch runs + summary.
- [ ] `--no-dispatch` on new/focus/step/init skips auto-dispatch.
- [ ] No `pack` references remain in code, templates, docs, or tests (grep clean).
- [ ] `pnpm build && pnpm test && pnpm lint && pnpm typecheck` green.
- [ ] `node bin/chitking.js --help` and `node bin/chitking.js dispatch --help` correct.

## Definition of Done

- All Chitking-native naming preserved (chitking, .chitking, research/, ck-dispatch).
- No Trellis/rt product language introduced.
- No new runtime dependencies.

## Out of Scope

- Multiple-role filtering (e.g. `--roles plan,build`) — single `--role` is enough for MVP.
- Changing role definitions in config.yaml or the packet YAML schema.
- Changing core init/new/focus/step semantics beyond adding auto-dispatch.
- Auto-dispatch after restore/rename/orient/record.

## Decision (ADR-lite)

**Context**: `pack` required a manual `--role <role>` per role and never auto-refreshed, so packets were routinely stale.
**Decision**: Rename to `dispatch`, default to all-roles, auto-trigger after init/new/focus/step (thread-state-establishing commands), with `--no-dispatch` opt-out and `--role` single-role escape hatch.
**Consequences**: `pack` is a clean break (external scripts must migrate); packets stay fresh automatically; `--no-dispatch` keeps tests/explicit flows controllable.

## Technical Notes

- Files referencing `pack`: src/commands/chitking.ts, src/cli/chitking.ts, src/templates/chitking/commands/ck-pack.md, README.md, demo/README.md, test/commands/chitking.test.ts, test/demo/demo.test.ts, test/templates/extract.test.ts.
- AGENTS.md: after CLI option/help changes, run `pnpm build` then `node bin/chitking.js --help`.
- `chitkingPack` is at src/commands/chitking.ts:1356; CLI wiring at src/cli/chitking.ts:132-141.
