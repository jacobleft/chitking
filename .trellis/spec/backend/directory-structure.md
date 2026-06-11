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
    ├── chitking/            # Chitking scaffold templates
    └── opencode/            # optional platform adapter templates

test/
├── commands/                # command behavior tests
├── demo/                    # committed demo workspace regression tests
└── templates/               # template helper/copy tests

demo/                        # committed Chitking example workspace and fixture
├── .chitking/               # Chitking product state
├── .opencode/               # generated adapter/tooling surface
└── research/                # user-owned research content

.github/workflows/
└── ci.yml                   # repository quality gate
```

---

## Module Organization

- Add new CLI subcommands in `src/cli/chitking.ts`, then delegate to an exported function in `src/commands/chitking.ts`.
- Keep parsing/Commander concerns in `src/cli/chitking.ts`. Example: `parseReadiness()` converts option text into a number before calling `chitkingStep()`.
- Keep domain behavior in `src/commands/chitking.ts`. Example: `chitkingStep()` validates maturity/readiness and writes `thread.md`.
- Keep path-building helpers near the state they address. Example: `getThreadPath()`, `getContextPath()`, and `getOpenCodeAdapterPath()` live with the command implementation that uses them.
- Keep template resolution in `src/templates/extract.ts`; command code imports `getChitkingRuntimeTemplatePath()` and `getOpenCodeTemplatePath()` rather than hard-coding `dist` paths.
- Add tests beside the area being changed: command behavior in `test/commands/chitking.test.ts`, template resolution in `test/templates/extract.test.ts`.
- Keep the committed demo workspace at top-level `demo/`. It is both a human-readable example and a regression fixture; tests for it live in `test/demo/`.
- Keep CI workflow files under `.github/workflows/`; the default quality workflow is `.github/workflows/ci.yml`.

---

## Naming Conventions

- Runtime source files use lowercase names matching the product or concern: `chitking.ts`, `extract.ts`, `constants.ts`.
- Exported command functions use the `chitking*` prefix: `chitkingInit`, `chitkingThreadNew`, `chitkingPack`, `chitkingRecord`.
- Runtime state constants use uppercase `const` names near the top of `src/commands/chitking.ts`, such as `CHITKING_DIR`, `RESEARCH_DIR`, `ACTIVE_FILE`, and `THREAD_FILE`.
- Generated product artifacts use Chitking-native names: `.chitking/`, `research/`, `chitking-*`, and `inject-chitking-context.js`.
- Slugs are lowercase letters/numbers/hyphens only. Existing enforcement: `validateSlug()` compares the provided slug to `slugifyTitle(slug)` and rejects mismatches.

---

## Examples

### CLI wiring delegates to command behavior

`src/cli/chitking.ts` defines options and delegates:

```ts
program
  .command("step")
  .description("Move maturity/readiness with explicit human consent")
  .option("--to <maturity>", "Explicit target maturity")
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
