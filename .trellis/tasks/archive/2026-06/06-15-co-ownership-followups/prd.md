# Co-Ownership Follow-ups: Seed Directive + Docs Sweep + Codex Parity

## Goal

Three follow-up items after the always-active plugin + doctrine co-ownership update:
1. Relax the seed-stage directive text to reflect co-ownership (agent writes directly, not "ask before writing").
2. Sweep docs for stale references to the old "humans own maturity" / linear model language.
3. Verify Codex adapter parity (expected: already complete — shared ck-*.md templates).

## Requirements

### 1. Relax seed directive (plugin)

In `src/templates/opencode/plugins/inject-chitking-context.js`, the `STAGE_DIRECTIVES.seed` text currently says "Present drafts conversationally; ask the user which to accept before writing to thread.md."

Update to: "Draft and write starter content to thread.md directly (hash-check first to avoid clobbering human edits). Present a summary of what was written for the user to review and revise."

Also update the corresponding test in `test/templates/plugin.test.ts` that verifies the seed directive text.

### 2. Docs sweep

Files to update:
- `demo/README.md:25` — "Humans own maturity, readiness, and source-of-truth decisions." → Update to reflect co-ownership: "Stage/readiness/maturity transitions are human-owned. Thread.md content is co-owned by agent and human."
- `README.md` — Add a brief "Research Lifecycle" section explaining: circular stages, per-stage readiness (resets on step), whole-thread maturity, and the assess/iterate commands. Keep it terse — a few lines, not a tutorial.

Files to verify (no change expected):
- `demo/research/project.md` — still accurate ("does not run autonomous research or silently advance maturity")
- `demo/research/contact-stability/thread.md` — frontmatter already migrated (stage/maturity)

### 3. Codex adapter parity

Expected: already complete. Verify:
- `src/templates/codex/config.toml` — unchanged (marker file only)
- ck-*.md templates are shared between OpenCode and Codex (already updated for stage/maturity/assess/iterate)
- `test/demo/demo.test.ts` already verifies Codex skill generation for all EXPECTED_CK_COMMANDS
- No Codex plugin equivalent exists (Codex doesn't support plugins) — the always-active directive + hash reload is OpenCode-only by design

Action: just confirm in the commit message. No code changes.

## Acceptance Criteria

* [ ] Seed directive text updated to co-ownership style (write directly, hash-check, present for review).
* [ ] `test/templates/plugin.test.ts` seed directive test updated to match.
* [ ] `demo/README.md` co-ownership language updated.
* [ ] `README.md` has a brief Research Lifecycle section.
* [ ] Codex parity verified (no changes needed).
* [ ] `pnpm build && pnpm test && pnpm lint && pnpm typecheck` pass.
* [ ] `git diff --check` clean.

## Out of Scope

* New commands or code logic changes.
* Codex plugin (doesn't exist — Codex has no plugin system).
* Config-customizable directive text.

## Technical Notes

* Plugin at `src/templates/opencode/plugins/inject-chitking-context.js` line ~19 (STAGE_DIRECTIVES.seed).
* Tests at `test/templates/plugin.test.ts`.
* `demo/README.md` and `README.md` are the only docs to change.
* Version bump not needed (docs + small text change — not a `feat:` commit).
