# Auto-bump patch version on every feature

## Goal

Automatically increment the patch version (`0.0.1`) whenever a feature is completed, so the CLI's `-v/--version` output and `package.json` version stay current without manual bookkeeping.

## What I already know

- Version is stored in **two places** that must stay in sync:
  - `package.json:3` — `"version": "0.0.0"`
  - `src/constants.ts:1` — `export const VERSION = "0.0.0";`
- CLI exposes version via Commander `.version(VERSION, "-v, --version")` in `src/cli/chitking.ts:38`.
- No git hooks, no husky — no existing hook infrastructure.
- Dev scripts live in `scripts/` (e.g., `scripts/copy-templates.js`); package scripts in `package.json`.
- Trellis workflow: Phase 3.4 is where the main agent drives the feature commit; finish-work archives the task + journals.

## Assumptions (temporary)

- "Every feature" = every `feat:` conventional commit (not docs/chore/test-only changes).
- Patch bump only (0.0.X); minor/major bumps remain manual if ever needed.
- The bump should include both `package.json` and `src/constants.ts` in the same commit.

## Requirements

- `scripts/bump-version.js` — a plain Node script (matching `scripts/copy-templates.js` style) that:
  - Reads the current version from `package.json`.
  - Increments the patch segment (`0.0.0` → `0.0.1` → `0.0.2`).
  - Writes the new version to `package.json` and `src/constants.ts`.
  - Prints the old → new version so the AI/dev sees the change.
- `"version:bump": "node scripts/bump-version.js"` added to `package.json` scripts.
- AGENTS.md updated: Phase 3.4 convention — the AI runs `pnpm version:bump` (or `node scripts/bump-version.js`) before committing `feat:` work, and includes the version change in the feature commit. Docs-only/chore/test commits do NOT bump.
- Version stays in sync between `package.json` and `src/constants.ts` at all times.

## Acceptance Criteria

- [ ] `node scripts/bump-version.js` increments patch version in both `package.json` and `src/constants.ts`.
- [ ] Script prints old → new version (e.g., `0.0.0 → 0.0.1`).
- [ ] After bump + `pnpm build`, `node bin/chitking.js --version` reflects the new version.
- [ ] Test verifies the bump script correctly increments both files from a temp fixture.
- [ ] `pnpm build && pnpm test && pnpm lint && pnpm typecheck` green.
- [ ] AGENTS.md Phase 3.4 convention documents when to run the bump.

## Decision (ADR-lite)

**Context**: Version (`0.0.0`) was frozen and never bumped; manual bookkeeping is error-prone with two files to sync.
**Decision**: A standalone `scripts/bump-version.js` triggered by convention during Phase 3.4 `feat:` commits. No git hooks (repo doesn't use them), no Trellis script modifications (survives `trellis update`).
**Consequences**: The bump relies on the AI/dev following the AGENTS.md convention; it's not enforced by tooling. If enforcement is needed later, a git hook can be added.

## Definition of Done

- `scripts/bump-version.js` works and is tested.
- `package.json` has `version:bump` script entry.
- AGENTS.md convention updated.
- `pnpm build && pnpm test && pnpm lint && pnpm typecheck` green.

## Out of Scope (explicit)

- Minor/major version bumps.
- npm publish / release automation.
- Changelog generation.

## Technical Notes

- Files: `scripts/bump-version.js` (new), `package.json` (scripts entry), `src/constants.ts` (version source), `AGENTS.md` (convention), `test/scripts/bump-version.test.ts` (new test).
- Existing pattern: `scripts/copy-templates.js` is a plain Node.js script — match its style.
- `src/constants.ts` format: `export const VERSION = "0.0.0";` — regex replace the quoted string.
- `package.json` format: `"version": "0.0.0",` — JSON parse + write, or targeted regex.
