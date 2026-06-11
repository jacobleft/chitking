# Fix CI Failures

## Goal

Fix the GitHub Actions CI failure on `main` and make the CI/runtime contract explicit enough to avoid repeating Node/pnpm/action-runtime mismatches.

## What I already know

- The failing run is `27329250225` on `main` after pushing `c91d833`.
- The failure happens during `actions/setup-node@v4` cache setup, before install/build/test run.
- The workflow originally used `pnpm/action-setup@v4` with `version: 11.5.2` and `actions/setup-node@v4` with `node-version: 20.x`.
- The failing log says pnpm `11.5.2` requires at least Node.js `v22.13` and then crashes with `ERR_UNKNOWN_BUILTIN_MODULE: No such built-in module: node:sqlite` under Node `v20.20.2`.
- The minimal fix to `node-version: 22.x` passed GitHub Actions in run `27329627116`.
- Research in `research/node-24-ci-feasibility.md` found that action runtime and project runtime are separate: `node-version` affects shell steps, while each `uses:` action has its own JavaScript action runtime.
- The user confirmed action versions should be upgraded and package runtime should move from Node `>=18.17.0` to a modern Node 20 baseline.

## Requirements

- Keep `.github/workflows/ci.yml` on a pnpm-compatible project runtime.
- Upgrade GitHub Actions to Node-24-runtime-compatible versions where feasible.
- Preserve the existing CI quality steps: install, build, test, lint, typecheck, and CLI help smoke check.
- Update `package.json` engines to require Node 20 or newer.
- Update Trellis spec documentation to distinguish GitHub action runtime, CI project runtime, package runtime baseline, and pnpm 11 dev/CI requirements.
- Do not change product runtime behavior beyond package metadata.

## Acceptance Criteria

- [x] CI workflow uses a Node version compatible with pnpm `11.5.2` (`22.x`).
- [x] CI workflow uses Node-24-runtime-compatible action majors where feasible.
- [x] Backend/core CLI quality spec no longer says CI uses Node 20 with pnpm 11.
- [x] Backend/core CLI quality spec distinguishes action runtime, project runtime, package engine, and pnpm 11 constraints.
- [x] `package.json` declares Node `>=20.0.0`.
- [x] Local verification still passes for the codebase checks affected by the workflow.
- [ ] Changes are committed and pushed to trigger CI again. (Deferred to main session; implement/check agents must not commit.)

## Definition of Done

- Local checks pass: `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `node bin/chitking.js --help`, `git diff --check`.
- GitHub Actions CI is re-triggered by push.

## Technical Approach

- Minimal fix: update `.github/workflows/ci.yml` from Node `20.x` to Node `22.x` so pnpm `11.5.2` can run.
- Keep `actions/setup-node` project runtime at `node-version: 22.x` as the current baseline for pnpm 11.
- Upgrade JavaScript action runtime surfaces:
  - `actions/checkout@v5`
  - `pnpm/action-setup@v6`
  - `actions/setup-node@v6`
- Update `package.json` from `"node": ">=18.17.0"` to `"node": ">=20.0.0"`.
- Update `.trellis/spec/backend/quality-guidelines.md` to record the separated runtime contract.

## Out of Scope

- Downgrading pnpm.
- Changing package dependencies.
- Changing application runtime behavior.
- Switching all CI project runtime checks to Node 24 or adding a Node runtime matrix.

## Technical Notes

- CI failure command: `gh run view 27329250225 --repo jacobleft/chitking --log-failed`.
- Root error: `warn: This version of pnpm requires at least Node.js v22.13` and `ERR_UNKNOWN_BUILTIN_MODULE: No such built-in module: node:sqlite`.
- Implementation note: `.github/workflows/ci.yml` first used `node-version: 22.x` while preserving install, build, test, lint, typecheck, and CLI help smoke steps.
- Validation note: the minimal Node 22 fix passed GitHub Actions in run `27329627116`.
- Expanded implementation note: actions now use Node-24-runtime-compatible majors while keeping shell/project runtime on Node 22.
- User correction recorded: `@types/node` is a type surface / minimum concern, not a runtime maximum.
- Local verification passed after expanded implementation: `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `node bin/chitking.js --help`, and `git diff --check`.
