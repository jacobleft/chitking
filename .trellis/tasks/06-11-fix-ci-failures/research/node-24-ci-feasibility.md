# Research: Node 24 CI feasibility

- **Query**: Research whether updating this repo's GitHub Actions CI to Node 24 is feasible and advisable, including action runtime compatibility, pnpm 11 support, package/runtime risks, and whether to keep Node 22, move to Node 24, or add a matrix.
- **Scope**: mixed
- **Date**: 2026-06-11

## Findings

### Files Found

| File Path | Description |
|---|---|
| `.github/workflows/ci.yml` | Current CI workflow. Runs one `quality` job on `ubuntu-latest`; uses `actions/checkout@v4`, `pnpm/action-setup@v4` with `version: 11.5.2`, `actions/setup-node@v4` with `node-version: 22.x` and `cache: pnpm`; then runs install, build, test, lint, typecheck, and CLI help smoke test. |
| `package.json` | Declares CLI package metadata, `type: module`, quality scripts, dependencies, dev dependencies, and `engines.node: >=18.17.0`. Dev deps include `@types/node ^20.17.10`, TypeScript, ESLint, Prettier, and Vitest. |
| `tsconfig.json` | Uses `target: ES2022`, `module: NodeNext`, `moduleResolution: NodeNext`, strict checks, declarations, and `lib: ["ES2022"]`. |
| `pnpm-lock.yaml` | Lockfile resolves `@types/node` to `20.19.42`, `typescript` to `5.9.3`, `vitest` to `4.1.8`, and `vite` to `8.0.16`. Vitest/Vite/Rolldown engine ranges include Node 24. |
| `.trellis/spec/backend/quality-guidelines.md` | Current spec says CI uses Node 22 and pnpm 11, and records the required CI command sequence. |
| `.trellis/tasks/06-11-fix-ci-failures/prd.md` | Task context: prior failure came from pnpm `11.5.2` requiring Node `>=22.13` while CI was using Node 20; minimal implemented fix was `node-version: 22.x`. |

### Code Patterns

- Current CI project runtime is set by `actions/setup-node` input, not by action metadata:
  - `.github/workflows/ci.yml:25-29`
    ```yaml
    - name: Set up Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 22.x
        cache: pnpm
    ```
- Current JavaScript action versions are still `@v4`:
  - `.github/workflows/ci.yml:17-29` uses `actions/checkout@v4`, `pnpm/action-setup@v4`, and `actions/setup-node@v4`.
- Package runtime contract remains broad:
  - `package.json:37-39` says `"node": ">=18.17.0"`.
  - This means CI on Node 22 or Node 24 only verifies a newer runtime, not the declared minimum runtime.
- Project uses stable Node built-ins and ESM patterns, with no direct `node:sqlite` usage:
  - `src/commands/chitking.ts:1-3` imports `node:fs`, `node:path`, `node:child_process`.
  - `src/cli/chitking.ts:2,139` uses `node:url` and `import.meta.url`.
  - `scripts/copy-templates.js:1-5` uses `node:fs`, `node:path`, `node:url`, and `import.meta.url`.
- Locked dev dependency engine ranges are compatible with Node 24:
  - `pnpm-lock.yaml:825-827` — `vite@8.0.16` has `engines: {node: ^20.19.0 || >=22.12.0}`.
  - `pnpm-lock.yaml:868-875` — `vitest@4.1.8` has `engines: {node: ^20.0.0 || ^22.0.0 || >=24.0.0}` and accepts `@types/node: ^20.0.0 || ^22.0.0 || >=24.0.0`.
  - `pnpm-lock.yaml:740-742` and `120-215` — `rolldown@1.0.3` and platform bindings require `^20.19.0 || >=22.12.0`, which includes Node 24.

### External References

- [GitHub Changelog: Deprecation of Node 20 on GitHub Actions runners](https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/) — authoritative source for the warning. It says runner `v2.328.0` supports both Node 20 and Node 24, defaults to Node 20 now, can test with `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`, and will begin using Node 24 by default on June 16, 2026. It also notes Node 24 incompatibility with macOS 13.4 and lower and no official ARM32 support.
- [GitHub Docs: metadata syntax, `runs` for JavaScript actions](https://docs.github.com/en/actions/reference/workflows-and-actions/metadata-syntax#runs-for-javascript-actions) — JavaScript action metadata chooses its own runtime with `runs.using`; supported values include `node20` and `node24`. The runtime executes the action's `main`, `pre`, and `post` scripts.
- [GitHub Docs: variables in workflows](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-variables#defining-environment-variables-for-a-single-workflow) — workflow/job/step `env` can set variables such as `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` for the runner environment.
- [actions/checkout releases](https://github.com/actions/checkout/releases) and [checkout changelog](https://github.com/actions/checkout/blob/main/CHANGELOG.md) — `actions/checkout@v5.0.0` updated the action to use Node 24 and requires Actions Runner `v2.327.1` or later. `v6` also includes credential persistence changes; release notes mention runner `v2.329.0` for Docker container action credential scenarios.
- [actions/checkout `v4` action.yml](https://raw.githubusercontent.com/actions/checkout/v4/action.yml) — `runs.using: node20` at the `v4` ref.
- [actions/checkout `v5` action.yml](https://raw.githubusercontent.com/actions/checkout/v5/action.yml) — `runs.using: node24`.
- [actions/setup-node README](https://github.com/actions/setup-node/blob/main/README.md) and [setup-node releases](https://github.com/actions/setup-node/releases) — `v5` upgraded the action runtime from Node 20 to Node 24 and requires runner `v2.327.1` or later; `v5` introduced automatic package-manager cache detection, while `v6` changed caching defaults again so npm auto-caching is enabled but pnpm caching must be set explicitly with `cache`.
- [actions/setup-node `v4` action.yml](https://raw.githubusercontent.com/actions/setup-node/v4/action.yml) — `runs.using: node20`.
- [actions/setup-node `v5` action.yml](https://raw.githubusercontent.com/actions/setup-node/v5/action.yml) — `runs.using: node24`.
- [actions/setup-node `v4` README](https://raw.githubusercontent.com/actions/setup-node/v4/README.md) — `node-version` input installs/downloads the requested Node.js version and adds it to `PATH`; this is the project runtime for later `run` steps. It supports semver specs and `cache: pnpm`.
- [pnpm/action-setup releases](https://github.com/pnpm/action-setup/releases) — `v5.0.0` updated the action to use Node 24; `v6.0.0` added support for pnpm v11.
- [pnpm/action-setup `v4` action.yml](https://raw.githubusercontent.com/pnpm/action-setup/v4/action.yml) — at the tested `v4` ref, `runs.using: node20`.
- [pnpm/action-setup `v4.4.0` action.yml](https://raw.githubusercontent.com/pnpm/action-setup/v4.4.0/action.yml) — `runs.using: node24`.
- [pnpm/action-setup `v6` action.yml](https://raw.githubusercontent.com/pnpm/action-setup/v6/action.yml) — `runs.using: node24`.
- [pnpm installation docs: Compatibility](https://pnpm.io/installation#compatibility) — pnpm 11 supports Node 22, Node 24, and Node 26, but not Node 18 or Node 20.
- [pnpm 11.0 release notes](https://pnpm.io/blog/releases/11.0) — pnpm 11 requires Node 22 or newer, drops Node 18/19/20/21, and the upgrade guidance says to bump CI and dev environments to Node 22+ before upgrading.
- Context7 Vitest docs for `/vitest-dev/vitest/v4.1.6` — Vitest 4 requires Vite >=6 and Node >=20. The locked `vitest@4.1.8` engine range in this repo explicitly includes `>=24.0.0`.

### Action runtime vs project runtime

These are separate knobs:

| Setting | What it affects | Current repo state | Node 24 implication |
|---|---|---|---|
| `uses: actions/...@...` plus each action's `action.yml` `runs.using` | Runtime used internally by JavaScript actions before/during their step implementation. Example: checkout's `dist/index.js`, setup-node's setup/cache scripts, pnpm/action-setup's install script. | Current workflow references `@v4` actions. `actions/checkout@v4` and `actions/setup-node@v4` declare `node20`; `pnpm/action-setup@v4` also declared `node20` at the tested ref. | The GitHub warning is about this layer. Updating only `node-version` does not update these action runtimes. Use Node-24 action releases (`checkout@v5+`, `setup-node@v5+`, `pnpm/action-setup@v5+`/`v6`) or opt in globally with `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` to test forced action execution. |
| `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` | Runner override for JavaScript action execution. | Not present in current workflow. | Lets users test the June 16, 2026 forced Node 24 behavior without changing the project Node version. It does not itself install Node 24 for `pnpm build`, `pnpm test`, etc. |
| `actions/setup-node` input `node-version: 22.x` or `24.x` | Node binary placed on `PATH` for later shell `run` steps: `pnpm install`, `pnpm build`, `pnpm test`, `node bin/chitking.js --help`, etc. | Current workflow uses `22.x`. | Changing this to `24.x` tests the Chitking package under Node 24, but does not by itself silence Node 20 JavaScript-action runtime warnings for actions whose metadata still says `node20`. |

### pnpm 11 and Node 24

- pnpm 11 is compatible with Node 24. Official pnpm compatibility docs mark pnpm 11 as supported on Node 22, Node 24, and Node 26.
- pnpm 11 is not compatible with Node 18 or Node 20. The pnpm 11.0 release notes explicitly state Node 22+ is required and Node 18/19/20/21 support is dropped.
- The prior CI failure is consistent with this: pnpm `11.5.2` under Node 20 warned that it requires at least Node `v22.13` and then hit `node:sqlite` availability problems.
- For the action itself, `pnpm/action-setup` has a separate support story: `v5` is Node-24 action runtime, and `v6` explicitly added support for pnpm v11.

### Package/runtime risks for Node 24

- **Feasibility risk is low for running CI on Node 24**: locked test/build tooling includes Node 24 in engine ranges (`vitest`, `vite`, `rolldown`), and source code uses stable Node core APIs.
- **Action-runtime warning is not solved by `node-version: 24.x` alone**: the warning concerns JavaScript action runtimes. `actions/checkout@v4`, `actions/setup-node@v4`, and the tested `pnpm/action-setup@v4` ref declare Node 20 internally.
- **Declared package engine is wider than CI**: `package.json` says Chitking supports Node `>=18.17.0`, but the chosen package manager (`pnpm 11.5.2`) requires Node 22+ for install/dev workflows. Node 24-only CI would not validate Node 18 or Node 22 behavior.
- **`@types/node` remains Node 20**: the repo type-checks against Node 20 declarations while potentially running on Node 22 or 24. That is acceptable if the package intentionally avoids newer Node APIs, but it means CI will not type-check Node 24-specific APIs and the type/runtime version contract is not aligned.
- **TypeScript `ES2022` + `NodeNext` is compatible with Node 24**: no evidence found that this TS config blocks Node 24.
- **Runner/OS caveat**: GitHub's Node 24 action runtime requires sufficiently new Actions runners; official action release notes cite runner `v2.327.1` for checkout/setup-node Node 24 action releases. GitHub-hosted `ubuntu-latest` should satisfy this, but self-hosted runners must be checked. Node 24 also removes support for macOS 13.4 and lower and ARM32 self-hosted action runtimes per GitHub's deprecation notice.

### Recommendation

**Recommended near-term path: keep project `node-version: 22.x`, and separately address/test JavaScript action runtime Node 24.**

Rationale:

1. Node 22 is the minimal project-runtime fix for pnpm 11 and matches the updated Trellis CI contract (`.trellis/spec/backend/quality-guidelines.md:116`).
2. Switching only `node-version` to `24.x` is feasible for package tests, but it does not address the GitHub Actions warning for `@v4` JavaScript actions whose metadata declares Node 20.
3. If the goal is readiness for the June 16, 2026 action-runtime change, the direct test is either:
   - add workflow/job `env: FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` while leaving project `node-version: 22.x`, or
   - update action majors to Node-24-runtime releases (`actions/checkout@v5` or newer, `actions/setup-node@v5`/`v6`, and `pnpm/action-setup@v6` for pnpm 11 support).
4. If the goal is package runtime confidence on Node 24, add a small matrix over Node `22.x` and `24.x`. Keep `22.x` as the minimum-supported dev/CI runtime while pnpm 11 is in use; optionally make Node 24 advisory/non-blocking only if runtime drift risk is a concern.

Decision options:

| Option | Feasible? | Advisable now? | Notes |
|---|---:|---:|---|
| Keep `node-version: 22.x` only | Yes | Yes, as the minimal CI-failure fix | Meets pnpm 11 requirement and current spec. Does not test Node 24 package runtime or action forced runtime. |
| Change only `node-version: 24.x` | Yes | Not as the only change | Tests Chitking under Node 24, but does not fix Node 20 JavaScript-action metadata warnings and stops validating Node 22. |
| Add matrix `22.x`, `24.x` | Yes | Good if extra CI time is acceptable | Best package-runtime coverage. Still separately update or force JavaScript action runtime if addressing GitHub warning. |
| Set `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` with Node 22 project runtime | Yes | Good targeted compatibility test | Tests the upcoming GitHub action-runtime change while preserving current project runtime. Watch for failures in `checkout`, `pnpm/action-setup`, and `setup-node` steps. |
| Update actions to Node-24-runtime releases | Yes | Advisable before June 16, 2026, after checking action breaking changes | Prefer `pnpm/action-setup@v6` for pnpm 11 support. For `setup-node`, `v5` changes cache auto-detection behavior; `v6` changes defaults again but explicit `cache: pnpm` preserves pnpm caching intent. |

## Related Specs

- `.trellis/spec/backend/quality-guidelines.md` — records CI workflow path, required commands, and current contract: "CI uses Node 22 and pnpm 11" at line 116.
- `.trellis/spec/backend/directory-structure.md` — records that CI workflow files live under `.github/workflows/`, with default `.github/workflows/ci.yml`.
- `.trellis/spec/frontend/type-safety.md` — mirrors TS settings (`ES2022`, `NodeNext`, `NodeNext`) relevant to runtime compatibility.

## Caveats / Not Found

- I did not run CI or modify workflow code; findings are based on repository inspection and official docs/release metadata.
- GitHub-hosted runner images should be new enough for Node 24 action releases, but no self-hosted runner inventory was available. Self-hosted runners need a runner-version and OS/architecture check.
- `pnpm/action-setup@v4` is ambiguous in practice because the major ref tested during research declares `node20`, while the specific `v4.4.0` tag declares `node24`; official releases also say `v6.0.0` adds pnpm v11 support. If updating action runtime, avoid ambiguity by moving to a current Node-24-runtime major that explicitly supports pnpm 11.
- No evidence found that Chitking source uses Node 24-only APIs or Node 20-incompatible APIs; however, Node 18 support claimed by `engines.node` is not validated by a pnpm 11 CI workflow.
