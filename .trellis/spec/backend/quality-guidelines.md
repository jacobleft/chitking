# Quality Guidelines

> Code quality standards for Chitking's command core.

---

## Overview

Chitking uses strict TypeScript, ESLint's recommended rules, `typescript-eslint` strict/stylistic rules, and Vitest. Quality is measured by working CLI behavior, stable generated scaffolds, and explicit source-of-truth boundaries.

Package scripts in `package.json` are the authoritative checks:

```json
{
  "build": "pnpm run clean && tsc && pnpm run copy-templates",
  "test": "vitest run",
  "lint": "eslint src/ test/",
  "format:check": "prettier --check src/ test/",
  "typecheck": "tsc --noEmit"
}
```

`format:check` exists but is not yet part of CI while existing source/test files have formatting drift. Do not add it to CI until it passes across the tracked files it checks.

---

## Required Patterns

- Export public command behavior through `src/index.ts` when tests or consumers need it.
- Use explicit function return types for named functions. ESLint enforces `@typescript-eslint/explicit-function-return-type` with expression allowances.
- Validate unknown YAML and frontmatter before trusting fields. Existing examples: `isRecord()`, `readYamlRecord()`, `stringField()`, `parseThreadContent()`.
- Keep source-of-truth mutations in command functions, not in generated adapters or hook templates.
- Preserve user edits when re-running `chitking init`; use `writeFileIfMissing()` for generated files.
- Keep template copying covered by build/test behavior when adding files under `src/templates/`.
- Keep the committed `demo/` workspace aligned with generated scaffold files when changing `chitking init`, role contracts, adapter templates, or `.gitignore` scaffold behavior.

---

## Forbidden Patterns

- No runtime dependency on development workflow state.
- No non-null assertions; ESLint enforces `@typescript-eslint/no-non-null-assertion`.
- No `var`; ESLint enforces `no-var`.
- No silent mutation of maturity/readiness outside explicit Chitking commands.
- No hand-editing generated context packets as durable truth.
- No HTTP/API/database abstractions unless a task explicitly introduces that architecture and updates specs.
- No broad `any`-based parsing for YAML or plugin state when an `unknown` + type guard pattern can express the boundary.

---

## Testing Requirements

- Add or update Vitest coverage for every command behavior change.
- Use temp directories for filesystem command tests, as in `test/commands/chitking.test.ts`.
- Clean temp directories in `afterEach()`.
- Spy on `console.log` for command tests that should not print during test runs.
- Test generated files and user-edit preservation when changing `chitking init`.
- Test generated context packet shape when changing `chitking pack`.
- Test CLI help when adding commands or options.
- Add or update `test/demo/demo.test.ts` when the committed top-level `demo/` fixture, default scaffold files, generated role contracts, generated adapters, or demo boundary wording changes.

Example test fixture pattern from `test/commands/chitking.test.ts`:

```ts
const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
  const tempDir = mkdtempSync(path.join(tmpdir(), prefix));
  tempDirs.push(tempDir);
  return tempDir;
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const tempDir of tempDirs.splice(0)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
```

Demo regression tests should compare the committed generated scaffold surface against a fresh `chitkingInit(tempDir)` when possible:

```ts
const tempDir = mkdtempSync(path.join(tmpdir(), "chitking-demo-"));
try {
  chitkingInit(tempDir);
  expect(generatedScaffoldPaths(DEMO_ROOT)).toEqual(generatedScaffoldPaths(tempDir));
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
```

---

## Scenario: Demo Fixture and CI Quality Gate

### 1. Scope / Trigger

- Trigger: adding or changing the committed `demo/` workspace, generated scaffold expectations, or GitHub Actions quality workflow.
- Scope: `demo/**`, `test/demo/**`, `.github/workflows/ci.yml`, and any package scripts the CI workflow invokes.

### 2. Signatures

- Demo fixture root: `demo/`.
- Demo regression tests: `test/demo/demo.test.ts`.
- CI workflow: `.github/workflows/ci.yml` with one `quality` job.
- Required CI command sequence: `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `node bin/chitking.js --help`.

### 3. Contracts

- `demo/.chitking/` is Chitking product state.
- `demo/research/` is user-owned research content.
- `demo/.opencode/` is generated adapter/tooling context, not durable research truth.
- `demo/research/*/context/` is generated/cache context and must not be treated as source of truth.
- `demo/` must not contain `.trellis/` runtime state.
- CI uses Node 22 and pnpm 11, matching current package-manager compatibility expectations.

### 4. Validation & Error Matrix

- Demo missing `.chitking/`, `research/`, or `.opencode/` -> failing demo boundary test.
- Demo includes `.trellis/` -> failing demo boundary test.
- Demo generated role/adapter surface drifts from fresh `chitking init` -> failing scaffold parity test.
- Demo text reintroduces historical bridge labels or derivative framing -> failing legacy-framing test.
- CI references a package script that does not pass locally -> CI workflow must not include that script yet; document the omission in the PRD.

### 5. Good/Base/Bad Cases

- Good: update template, run `chitking init` into a temp directory, compare generated scaffold files against `demo/`, and update demo intentionally.
- Base: add user-owned research example content under `demo/research/` while keeping generated/cache folders labeled as non-authoritative.
- Bad: add generated context packets as durable assertions, add `.trellis/` under `demo/`, or include `format:check` in CI while it fails on current tracked files.

### 6. Tests Required

- Assert top-level demo boundary files/directories exist.
- Assert demo wording distinguishes product state, user research, generated adapters, and cache/context.
- Assert generated role contracts and OpenCode adapters exist for each configured role.
- Assert generated scaffold files match a fresh `chitkingInit(tempDir)` where feasible.
- Assert human-owned readiness/maturity wording remains present.
- Assert historical bridge labels and legacy command names are absent.

### 7. Wrong vs Correct

#### Wrong

```yaml
# .github/workflows/ci.yml
- name: Format check
  run: pnpm format:check # added while the command fails on existing tracked files
```

#### Correct

```yaml
# .github/workflows/ci.yml
- name: Build
  run: pnpm build
- name: Test
  run: pnpm test
- name: Lint
  run: pnpm lint
- name: Typecheck
  run: pnpm typecheck
- name: CLI help smoke test
  run: node bin/chitking.js --help
```

Document any intentionally omitted check in the task PRD until the repo is ready to enforce it.

---

## Code Review Checklist

- [ ] Product wording remains Chitking-native and respects the product doctrine.
- [ ] `.chitking/`, `.trellis/`, and `research/` boundaries remain clear.
- [ ] Generated packets/adapters remain cache/context, not product truth.
- [ ] Human-owned maturity/readiness transitions require explicit command/user intent.
- [ ] New helpers do not duplicate existing path, YAML, slug, config, or thread parsing helpers.
- [ ] Tests cover success and failure cases for filesystem state changes.
- [ ] Demo fixture changes update `test/demo/demo.test.ts` and preserve `.chitking/`, `research/`, `.opencode/`, and cache/source-of-truth boundaries.
- [ ] `pnpm build`, `pnpm test`, `pnpm lint`, and `pnpm typecheck` pass.

---

## Current Lint / Type Rules to Remember

From `eslint.config.js` and `tsconfig.json`:

- TypeScript target/module: `ES2022` + `NodeNext`.
- `strict` TypeScript is enabled.
- Explicit return types are required for named functions.
- Unused variables are errors, with `_`-prefixed args/vars ignored.
- `prefer-const` and `no-var` are errors.
- `no-console` is disabled because this is a CLI.
