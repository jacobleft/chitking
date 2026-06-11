# Top-level Thread Commands

## Goal

Replace the nested `chitking thread new` shape with a simple top-level thread-management CLI.

Chitking should feel direct: thread operations are common enough that users should not need a `thread` namespace for them.

## What I already know

- Current CLI defines only one nested thread subcommand: `chitking thread new <title> [--slug <slug>]` in `src/cli/chitking.ts`.
- Current CLI already has top-level `focus [thread]`.
- Current command implementation has `chitkingThreadNew()` and `chitkingFocus()` exported from `src/commands/chitking.ts`.
- Thread files live at `research/<slug>/thread.md`; per-thread generated context lives at `research/<slug>/context/`.
- User wants all thread-management commands to be top-level.
- User explicitly wants old `chitking thread new` removed completely, not kept as an alias; breaking compatibility is acceptable.
- User wants destructive commands to require confirmation.

## Requirements

- Remove the `chitking thread` command namespace completely.
- Add top-level thread commands:
  - `chitking new <title> [--slug <slug>]`
  - `chitking list`
  - `chitking show [thread]`
  - `chitking focus <thread>` or keep compatible focused behavior if no argument is useful
  - `chitking rename <thread> <title>`
  - `chitking archive <thread>`
  - `chitking restore <thread>`
  - `chitking delete <thread>`
- Destructive commands must require explicit `--yes` confirmation where specified below.
- Update command help, README/demo/docs where command examples mention old `thread new`.
- Update tests for new commands and removal of `chitking thread new`.
- Preserve Chitking product boundaries: `.chitking/` product state, `research/` user research content, generated context as cache.

## Confirmation design

Keep it simple:

- `archive <thread> --yes` required.
- `delete <thread> --yes` required.
- `restore <thread>` does not require confirmation because it is undo/recovery.
- `rename <thread> <title>` does not require confirmation because it is reversible enough and not deletion.

Rejected for MVP:

- Interactive prompts, because current command functions are synchronous and tests are simpler without stdin handling.
- Exact-slug confirmation flags like `--confirm <thread>`, because they are safer but more typing and less simple-minded.

## Rename design

- `rename <thread> <title>` updates the human title in `thread.md` only.
- The thread slug/directory remains stable to avoid breaking file references, generated context paths, and active-thread pointers.
- Changing slugs or moving directories is out of scope for this MVP.

## Acceptance Criteria

- [x] `chitking --help` shows top-level `new`, `list`, `show`, `focus`, `rename`, `archive`, `restore`, and `delete` commands.
- [x] `chitking thread` is not present in help and `chitking thread new` no longer works.
- [x] `new` creates and focuses a thread with the same durable file shape as the previous `thread new` behavior.
- [x] `list` shows available non-archived threads.
- [x] `show [thread]` prints a readable summary for the specified or active thread.
- [x] `focus <thread>` focuses an existing non-archived thread.
- [x] `rename <thread> <title>` updates the thread title while preserving the thread slug/directory.
- [x] `archive <thread>` requires confirmation and hides archived threads from normal list/focus behavior.
- [x] `restore <thread>` restores an archived thread.
- [x] `delete <thread>` requires confirmation before removing a thread's durable research directory.
- [x] Tests cover new top-level commands, confirmation failures, and old namespace removal.
- [x] Local checks pass: `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `node bin/chitking.js --help`, `git diff --check`.

## Definition of Done

- PRD confirmed by user.
- `implement.jsonl` and `check.jsonl` contain relevant spec/context entries.
- Task is started, implemented by `trellis-implement`, checked by `trellis-check`, spec-updated if needed, committed, pushed, and CI green.

## Out of Scope

- Keeping compatibility aliases for `chitking thread new`.
- Complex thread merge/split/duplicate/import/export/tag commands.
- Interactive stdin prompts unless explicitly chosen later.
- Slug-changing rename/move behavior.

## Technical Notes

- CLI wiring: `src/cli/chitking.ts`.
- Command behavior: `src/commands/chitking.ts`.
- Existing tests: `test/commands/chitking.test.ts`.
- Relevant specs: backend directory structure, error handling, logging, quality guidelines, and Chitking product doctrine.

## Validation Notes

- Implemented and checked by Trellis implementation/check agents.
- Parent-session verification passed:
  - `pnpm build`
  - `pnpm test` — 24 tests passed
  - `pnpm lint`
  - `pnpm typecheck`
  - `node bin/chitking.js --help`
  - `git diff --check`
- `node bin/chitking.js --help` shows top-level thread commands and no `thread` namespace.
- Follow-up: aligned the generated Chitking workflow skill template and committed demo copy with the top-level thread lifecycle command set, including `archive/delete --yes` confirmation requirements and generated-context-as-cache boundaries.
- Follow-up verification passed: `pnpm build`, `pnpm test` (24 tests passed), `pnpm lint`, `pnpm typecheck`, and `git diff --check`.
