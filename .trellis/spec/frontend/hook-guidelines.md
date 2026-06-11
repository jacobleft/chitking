# Hook Guidelines

> Current hook reality: no React hooks; one generated OpenCode plugin hook template.

---

## Overview

Chitking has no frontend custom hooks because it has no browser UI. Do not add `use*` hooks or React stateful logic for current CLI work.

The only "hook"-like code in the repository is the generated OpenCode plugin template at `src/templates/opencode/plugins/inject-chitking-context.js`. It is an optional platform adapter created by `chitking init`, not a product source-of-truth layer.

---

## Custom Hook Patterns

No custom frontend hook pattern exists.

For reusable CLI logic, current code uses plain functions in `src/commands/chitking.ts`, such as:

- `readYamlRecord()` for YAML parsing.
- `parseThreadContent()` for thread frontmatter/body parsing.
- `roleRiskWarnings()` for role gate warnings.
- `findStalePackets()` for generated packet freshness checks.

Do not name plain command helpers with a `use` prefix.

---

## Data Fetching

There is no client/server data fetching. Current data access is local filesystem and Git metadata:

```ts
const dirtyOutput = execFileSync(
  "git",
  ["status", "--porcelain", "--untracked-files=all"],
  {
    cwd,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
  },
).trimEnd();
```

Generated plugin hooks read local files only and should never mutate Chitking state.

---

## Naming Conventions

- Command helpers use verbs or nouns that describe the operation: `loadConfig`, `resolveActiveThread`, `writeActiveState`, `appendToSection`.
- Generated plugin hook functions describe their adapter role: `buildRoleContext`, `buildMainBreadcrumb`, `loadChitkingState`.
- Reserve `use*` names for a future real frontend hook layer, if one is added and documented.

---

## Example: Read-Only Generated Platform Hook

`src/templates/opencode/plugins/inject-chitking-context.js` injects context but intentionally does not write state:

```js
"tool.execute.before": async (input, output) => {
  try {
    if (!isChitkingRepo(directory)) return
    if ((input?.tool || "").toLowerCase() !== "task") return
    // ...read state and prepend bounded context...
  } catch {
    // Best-effort context only; never block OpenCode tool execution.
  }
}
```

---

## Common Mistakes

- Do not confuse generated platform hooks with durable Chitking product truth.
- Do not add React hooks to share CLI state.
- Do not let plugin hook failures block tool execution.
- Do not let plugin hooks change maturity, readiness, `thread.md`, `active.yaml`, `config.yaml`, or generated packets.
