# Guide to local testing on a demo repo

## Goal

Add documentation that guides a developer/contributor through building the local Chitking CLI and exercising it end-to-end against the committed `demo/` workspace, so manual verification of CLI behavior is reproducible without guessing.

## What I already know

- `demo/` is a committed example workspace with user-owned `research/` content (`research/project.md`, `research/contact-stability/thread.md`).
- `demo/README.md` already has a "Try it locally" section, but it assumes `chitking` is already on PATH — it does not explain how to build/link the local CLI first.
- Main `README.md` "Development" section lists `pnpm install/build/test/lint/typecheck` but does NOT cover running the CLI against the demo.
- `demo/` does not commit `.chitking/`, `.opencode/`, or `.codex/`; `chitking init` regenerates them and they stay ignored via `demo/.gitignore`.
- Public CLI binary: `bin/chitking.js`, which loads built code from `dist/cli/chitking.js`.
- `package.json` `bin`: `chitking -> ./bin/chitking.js`.
- Available runtime commands: `init`, `new`, `list`, `show`, `focus`, `rename`, `archive`, `restore`, `delete`, `orient`, `step`, `pack`, `record`.

## Assumptions (temporary)

- "local test on a demo repo" = a contributor-facing manual-verification workflow: build the CLI locally, run it against `demo/`, observe output, clean up generated state.
- The audience is contributors who want to sanity-check the CLI after changes, not end users installing from npm.
- The guide should bridge the gap between `pnpm build` (in main README) and `chitking init` (in demo README) by explaining how to make the local build runnable as `chitking`.

## Decisions

- **Location**: Expand main `README.md` "Development" section with a "Local testing against the demo" subsection. Add a cross-link from `demo/README.md` back to it.
- **Run mechanism**: Document both — `pnpm link --global` as the primary path (matches demo/README's bare `chitking` style), and `node bin/chitking.js` as a no-install fallback.

## Requirements

- Add a "Local testing against the demo" subsection under `## Development` in `README.md`.
- Cover the full contributor workflow: build (`pnpm build`) → make runnable (`pnpm link --global` OR direct `node bin/chitking.js`) → run against `demo/` (mirror the `init` / `focus` / `orient` / `pack` sequence from demo/README) → observe outputs → reset demo state.
- Note the Node >=20 prerequisite (from package.json engines / AGENTS.md).
- Add a one-line pointer to automated tests (`pnpm test`) to distinguish manual verification from the regression suite.
- Add a cross-link from `demo/README.md` "Try it locally" to the new README subsection so readers know how to build first.
- Reset/cleanup: document `git clean -fdX demo/` to remove only ignored generated state (`.chitking/`, `.opencode/`, `.codex/`) without touching committed files.

## Acceptance Criteria

- [ ] `README.md` Development section has a reproducible local-testing subsection.
- [ ] Subsection covers build → run (both mechanisms) → observe → reset.
- [ ] No runtime code, dependency, or build-script changes.
- [ ] `demo/README.md` cross-links to the new guide.
- [ ] Commands in the guide match what the built CLI actually accepts (verified against `bin/chitking.js` + existing command surface).

## Decision (ADR-lite)

**Context**: Contributors had no bridging doc between `pnpm build` and exercising the CLI on the demo.
**Decision**: Single subsection in the main README (most discoverable), documenting both run mechanisms so contributors aren't forced to modify their global bin.
**Consequences**: README stays the single source for dev workflow; demo/README becomes a pointer for the build prerequisite.

## Out of Scope

- Changing Chitking runtime behavior or adding dependencies.
- Automated test changes (covered separately by `test/demo/`).

## Technical Notes

- Candidate run paths to document: `pnpm link` (global shim) vs `node bin/chitking.js` (direct invocation) vs `pnpm exec chitking`.
- `demo/.gitignore` already ignores generated adapter surfaces; cleanup story is `git clean -fd demo/` or manual `rm -rf demo/.chitking demo/.opencode demo/.codex`.
