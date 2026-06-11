# Fix CI Failures

## Goal

Fix the GitHub Actions CI failure on `main` so pushed commits can pass the repository quality gate.

## What I already know

- The failing run is `27329250225` on `main` after pushing `c91d833`.
- The failure happens during `actions/setup-node@v4` cache setup, before install/build/test run.
- The workflow uses `pnpm/action-setup@v4` with `version: 11.5.2` and `actions/setup-node@v4` with `node-version: 20.x`.
- The failing log says pnpm `11.5.2` requires at least Node.js `v22.13` and then crashes with `ERR_UNKNOWN_BUILTIN_MODULE: No such built-in module: node:sqlite` under Node `v20.20.2`.
- The local quality suite passed before push: build, test, lint, typecheck, CLI help, diff check, and task validation.

## Requirements

- Fix `.github/workflows/ci.yml` so the configured Node version is compatible with the configured pnpm version.
- Preserve the existing CI quality steps: install, build, test, lint, typecheck, and CLI help smoke check.
- Update Trellis spec documentation if it records the wrong CI Node/pnpm contract.
- Do not change product runtime behavior.

## Acceptance Criteria

- [x] CI workflow uses a Node version compatible with pnpm `11.5.2` (`22.x`).
- [x] Backend/core CLI quality spec no longer says CI uses Node 20 with pnpm 11.
- [x] Local verification still passes for the codebase checks affected by the workflow.
- [ ] Changes are committed and pushed to trigger CI again. (Deferred to main session; implement agent must not commit.)

## Definition of Done

- Local checks pass: `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `node bin/chitking.js --help`, `git diff --check`.
- GitHub Actions CI is re-triggered by push.

## Technical Approach

- Minimal fix: update `.github/workflows/ci.yml` from Node `20.x` to Node `22.x` so pnpm `11.5.2` can run.
- Update `.trellis/spec/backend/quality-guidelines.md` CI contract from Node 20 to Node 22 / pnpm 11 compatibility.

## Out of Scope

- Downgrading pnpm.
- Changing package dependencies.
- Changing application runtime behavior.

## Technical Notes

- CI failure command: `gh run view 27329250225 --repo jacobleft/chitking --log-failed`.
- Root error: `warn: This version of pnpm requires at least Node.js v22.13` and `ERR_UNKNOWN_BUILTIN_MODULE: No such built-in module: node:sqlite`.
- Implementation note: `.github/workflows/ci.yml` now uses `node-version: 22.x` while preserving install, build, test, lint, typecheck, and CLI help smoke steps.
- Local verification passed after implementation: `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `node bin/chitking.js --help`, and `git diff --check`.
