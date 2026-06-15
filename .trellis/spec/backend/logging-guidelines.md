# Logging Guidelines

> Console output conventions for Chitking CLI commands.

---

## Overview

Chitking does not currently use a logging library or structured logger. CLI commands write user-facing output with `console.log()` and errors with `console.error()` from the CLI error boundary.

Output is part of the CLI contract. Keep it concise, actionable, and stable enough for tests and users.

---

## Log Levels

There are no formal log levels. Current conventions are:

- `console.log()` for successful command output and status summaries.
- `console.error()` for command failures in `runWithErrors()`.
- Optional debug stack traces only when `DEBUG` or `TRELLIS_DEBUG` is set.

Do not add a logger dependency unless a task explicitly requires structured logs.

---

## Output Patterns

- Commands that create or update state print a single confirmation line.
- Commands that report status return and print the same string where tests need to inspect behavior.
- Commands that produce a path print the repo-relative path, not the absolute path.
- Orientation output is multi-line and grouped into warnings, risky roles, recommended actions, and recovery options.

---

## Examples

### Single-line confirmations

`src/commands/chitking.ts`:

```ts
console.log("Chitking initialized.");
console.log(`Created and focused research thread: ${slug}`);
console.log(`Active thread: ${slug}`);
console.log(`Recorded ${options.type} for ${slug}.`);
```

### Path-producing command output

`chitkingDispatch()` writes a generated context packet and prints the relative path. With `--role <role>` it prints one path; without `--role` it prints each role's packet path on its own line (best-effort: per-role failures are reported without aborting):

```ts
const repoPath = toRepoPath(cwd, packetPath);
console.log(repoPath);
return repoPath;
```

### Auto-dispatch summary output

When `new`, `focus`, `step`, or `init` (with an active thread) complete their primary work, they call `autoDispatch()` which prints a one-line summary — not individual paths:

```ts
console.log(`Dispatched ${roleCount} role packets for ${slug}.`);
```

Use `--no-dispatch` on `init`/`new`/`focus`/`step`/`iterate` to opt out of auto-dispatch entirely. `init` with no active thread skips dispatch silently.

### Commander `--no-*` flag ↔ command function boundary

Commander parses `--no-dispatch` as `{ dispatch: false }`, but command functions (`chitkingNew`, `chitkingFocus`, `chitkingStep`, `chitkingIterate`, `chitkingInit`) expect `{ noDispatch: true }`. The CLI layer must translate between these two conventions. Use the `withNoDispatch()` adapter in `src/cli/chitking.ts` to bridge the boundary. Without it, `--no-dispatch` silently dispatches anyway — unit tests miss this because they call command functions directly, bypassing Commander's option parser.

### Error output

`src/cli/chitking.ts` formats command errors consistently:

```ts
console.error(
  chalk.red("Error:"),
  error instanceof Error ? error.message : error,
);
```

---

## What to Log

- State changes the user requested, such as init, focus, step, thread creation, record, and dispatch.
- Auto-dispatch summaries triggered by init/new/focus/step when an active thread exists.
- Current state summaries from `chitking orient`, including maturity/readiness, blockers, stale packets, risky roles, and next safe actions.
- Relative paths to generated artifacts when the command's purpose is to create a consumable artifact.

---

## What NOT to Log

- Do not log full `research/project.md` or `research/<thread>/thread.md` contents when a path reference is enough.
- Do not log secrets, tokens, or environment variables.
- Do not log stack traces by default.
- Do not log absolute temp paths in tests or user-facing command output unless diagnosing a debug-only issue.
- Do not let optional platform adapter hooks throw visible logging noise during normal operation.
