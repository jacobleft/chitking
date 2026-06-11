# Error Handling

> How CLI errors are raised, caught, printed, and tested.

---

## Overview

Command implementation functions throw standard `Error` objects with user-readable messages. The CLI layer catches those errors in one place, prints a concise message, optionally prints a stack trace in debug mode, and exits with status code `1`.

There are no custom error classes, HTTP response errors, or structured API error payloads in the current codebase.

---

## Error Types

- Use standard `Error` for validation and state errors.
- Keep messages actionable and tied to the command the user can run next.
- Use `null` only for internal fallbacks where the caller explicitly handles absence, such as `resolveCommit()` returning `null` for an unresolvable Git ref.

Examples from `src/commands/chitking.ts`:

```ts
throw new Error("Run chitking init before using Chitking commands.");
throw new Error("No active Chitking thread. Run chitking thread new first.");
throw new Error(`Thread already exists: ${slug}`);
throw new Error("chitking step --to requires --reason.");
```

---

## Error Handling Patterns

- Validate at the boundary closest to the input:
  - CLI option parser `parseReadiness()` validates option text.
  - Command helper `validateReadiness()` validates command-level numeric input.
  - `validateSlug()` rejects malformed slugs before filesystem paths are built.
- Let command functions throw. Do not catch and suppress errors inside command behavior unless the operation is intentionally best-effort.
- Use localized `try` / `catch` only for best-effort probes, such as Git metadata reads or generated plugin context injection.
- Keep `runWithErrors()` as the CLI catch boundary.

---

## CLI Error Output

`src/cli/chitking.ts` centralizes CLI error output:

```ts
function runWithErrors(action: () => void): void {
  try {
    action();
  } catch (error) {
    console.error(
      chalk.red("Error:"),
      error instanceof Error ? error.message : error,
    );
    if (process.env.DEBUG || process.env.TRELLIS_DEBUG) {
      console.error(error instanceof Error ? error.stack : error);
    }
    process.exit(1);
  }
}
```

Keep this behavior when adding commands: user-facing failures should be short by default, with stack traces only under debug environment variables.

---

## Best-Effort Boundaries

Best-effort operations should fail closed and avoid blocking user work:

- `readGitSnapshot()` catches Git command failures and returns empty arrays.
- `resolveCommit()` catches failed `git rev-parse` calls and returns `null` for the caller to turn into a user-facing error when needed.
- `src/templates/opencode/plugins/inject-chitking-context.js` catches hook errors and intentionally never blocks OpenCode tool execution or chat turns.

Example:

```ts
function resolveCommit(cwd: string, ref: string): string | null {
  try {
    return execFileSync("git", ["rev-parse", ref], {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}
```

---

## Common Mistakes

- Do not print errors inside command functions and again in `runWithErrors()`.
- Do not call `process.exit()` from command behavior in `src/commands/`; keep process control in the CLI layer.
- Do not expose stack traces by default.
- Do not silently continue after invalid source-of-truth state, such as malformed `thread.md` frontmatter.
