# Directory Structure

> How Chitking's TypeScript command core is organized.

---

## Overview

Chitking's runtime is a small TypeScript CLI under `src/`. Keep user-facing command wiring separate from command behavior:

- `src/cli/` defines the Commander program and argument parsing.
- `src/commands/` contains the command behavior and persistence logic.
- `src/templates/` contains template-path helpers and tracked runtime templates copied into `dist/` during build.
- `src/constants.ts` contains product metadata exported to the CLI and package API.
- `src/index.ts` is the public module export surface.

There is no server routing layer. Do not create `routes/`, `controllers/`, `api/`, or `services/` directories just because a generic backend pattern suggests them.

---

## Directory Layout

```
src/
├── cli/
│   └── chitking.ts          # Commander program, options, CLI error wrapper
├── commands/
│   └── chitking.ts          # command behavior, file/YAML state, Git snapshot reads
├── constants.ts             # product metadata
├── index.ts                 # public exports
└── templates/
    ├── extract.ts           # runtime template path helpers
    ├── chitking/            # Chitking scaffold templates and shared command bodies
    ├── codex/               # optional Codex adapter templates
    └── opencode/            # optional OpenCode adapter templates

test/
├── commands/                # command behavior tests
├── demo/                    # committed demo workspace regression tests
└── templates/               # template helper/copy tests

demo/                        # committed Chitking example workspace and fixture
└── research/                # user-owned research content

.github/workflows/
└── ci.yml                   # repository quality gate
```

---

## Module Organization

- Add new CLI subcommands in `src/cli/chitking.ts`, then delegate to an exported function in `src/commands/chitking.ts`.
- Keep parsing/Commander concerns in `src/cli/chitking.ts`. Example: `parseReadiness()` converts option text into a number before calling `chitkingStep()`.
- Keep domain behavior in `src/commands/chitking.ts`. Example: `chitkingStep()` validates stage/readiness transitions (with circular loop-back at the final stage) and writes `thread.md`.
- Keep path-building helpers near the state they address. Example: `getThreadPath()`, `getContextPath()`, and `getOpenCodeAdapterPath()` live with the command implementation that uses them.
- Keep template resolution in `src/templates/extract.ts`; command code imports `getChitkingRuntimeTemplatePath()` and `getOpenCodeTemplatePath()` rather than hard-coding `dist` paths.
- Add tests beside the area being changed: command behavior in `test/commands/chitking.test.ts`, template resolution in `test/templates/extract.test.ts`.
- Keep the committed demo workspace at top-level `demo/`. It is both a human-readable example and a regression fixture; tests for it live in `test/demo/`. Do not commit `demo/.chitking/`, `demo/.opencode/`, or `demo/.codex/`; local runtime product state and generated adapter surfaces may be generated there during experimentation but are ignored.
- Keep CI workflow files under `.github/workflows/`; the default quality workflow is `.github/workflows/ci.yml`.

---

## Naming Conventions

- Runtime source files use lowercase names matching the product or concern: `chitking.ts`, `extract.ts`, `constants.ts`.
- Exported command functions use the `chitking*` prefix: `chitkingInit`, `chitkingNew`, `chitkingDispatch`, `chitkingRecord`.
- Runtime state constants use uppercase `const` names near the top of `src/commands/chitking.ts`, such as `CHITKING_DIR`, `RESEARCH_DIR`, `ACTIVE_FILE`, and `THREAD_FILE`.
- Generated product artifacts use Chitking-native names: `.chitking/`, `research/`, `chitking-*`, `ck-*`, and `inject-chitking-context.js`.
- Slugs are lowercase letters/numbers/hyphens only. Existing enforcement: `validateSlug()` compares the provided slug to `slugifyTitle(slug)` and rejects mismatches.

---

## Examples

### CLI wiring delegates to command behavior

`src/cli/chitking.ts` defines options and delegates:

```ts
program
  .command("step")
  .description("Move stage/readiness with explicit human consent")
  .option("--to <stage>", "Explicit target stage")
  .option("--readiness <0-5>", "Set readiness score", parseReadiness)
  .option("--reason <text>", "Required reason for explicit --to moves")
  .action((options: { to?: string; readiness?: number; reason?: string }) =>
    runWithErrors(() => chitkingStep(options)),
  );
```

### Command code owns file paths and state mutations

`src/commands/chitking.ts` centralizes paths and writes:

```ts
function getThreadPath(cwd: string, slug: string): string {
  return path.join(getThreadDir(cwd, slug), THREAD_FILE);
}

function writeThread(cwd: string, slug: string, thread: ParsedThread): void {
  fs.writeFileSync(
    getThreadPath(cwd, slug),
    formatThreadContent(thread),
    "utf-8",
  );
}
```

### Template helpers are isolated

`src/templates/extract.ts` keeps template lookup independent from commands:

```ts
export function getChitkingRuntimeTemplatePath(...segments: string[]): string {
  return path.join(getTemplateRootPath(), "chitking", ...segments);
}
```

---

## Adding a Role

When adding a new Chitking role, touch these files in order. The pattern is established by `plan/dreamer/build/verify/synthesize/review/oracle/predict`.

### Files to change

1. **`src/templates/chitking/config.yaml`** — add a `<role>:` entry under `roles:` with `min_stage`, `min_readiness`, `warnings` (boundary reminders), and `prompt: { objective, stop_conditions }`. This is the source of truth for the role's gates and posture.
2. **`src/cli/chitking.ts`** — add the role name to the `--role` help enumeration (the parenthesized list in the `dispatch` command's `--role` option description).
3. **`src/commands/templates.ts`** — choose a contract template (see below) and, if the role has hard boundaries, add a `<role>Boundary` conditional in `opencodeAdapterContent` sibling to `dreamerBoundary` / `predictBoundary`.
4. **`src/commands/types.ts`** — only if the role introduces a new record type: add `"type": "Section"` to `RECORD_SECTION_BY_TYPE` **and** add the section name to `REQUIRED_THREAD_SECTIONS`. These two are coupled — adding one without the other breaks either `ck-record --type` or the `ck-new` thread scaffold.
5. **Tests** — `test/commands/chitking.test.ts` (role-count assertions, dispatch packet, stage-gate warnings both at-floor and below-floor, contract content) and `test/demo/demo.test.ts` (adapter role list).

### When to use a special-case contract template

The default `defaultRoleContractContent` covers advisory roles whose output is free-form prose. Add a special-case `<role>RoleContractContent` function (precedent: `dreamerRoleContractContent`, `predictRoleContractContent`) when the role needs either of:

- **Required Output Shape** — labeled fields the agent must emit (e.g., predict's `Claim / Source / Predicted Effect / Falsification Criterion`).
- **Hard Boundaries** — cross-role routing rules that the default contract's "Universal Boundaries" do not cover (e.g., dreamer→build forbidden; predict→build forbidden without plan/review).

Wire a `roleName === "<role>"` branch into the contract dispatcher loop (the fork around `templates.ts:270` that selects between default/dreamer/predict). Packet generation (`buildRolePacket`) stays generic — it reads `config.yaml` and does not per-role branch.

### Record-type → section coupling

Adding a record type requires touching both maps in `src/commands/types.ts`:

```ts
export const RECORD_SECTION_BY_TYPE = {
  evidence: "Evidence",
  failure: "Failed Paths",
  decision: "Decisions & Maturity History",
  revision: "Current Claim",
  prediction: "Predictions",  // <-- new record type → new section
} as const;

export const REQUIRED_THREAD_SECTIONS = [
  "Theory Brief",
  // ...
  "Predictions",  // <-- must also be added here so ck-new scaffolds it
] as const;
```

Forgetting the `REQUIRED_THREAD_SECTIONS` entry means new threads won't scaffold the section header; `appendToSection` will still create it lazily on first record, but existing tests that assert section presence on `ck-new` will fail.

### Permissions

`opencodePermissionsForRole` in `src/commands/templates.ts` has three tiers: `build` (read+edit+bash), `verify` (read+bash), and the default fall-through (read-only). Most advisory roles use the default tier — no code change needed. Only add a branch when the role genuinely needs write or bash access (and consider whether that undermines the role's discipline, e.g., giving predict `bash` would let it peek at results before committing to a prediction).
