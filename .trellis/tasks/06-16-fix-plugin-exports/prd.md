# Fix: Remove Named Exports from Plugin — Breaks OpenCode Loader

## Problem

OpenCode log shows: `"failed to load plugin" error="Plugin export is not a function"`

Our plugin has named exports (`export { computeHash, STAGE_DIRECTIVES, buildActiveDirective }`) alongside `export default`. OpenCode's plugin loader expects the module's export to be a function. Named exports change the module namespace shape, causing the loader to reject it.

Trellis plugins only have `export default` — no named exports — and they load fine.

## Fix

### 1. Remove named exports from plugin template

In `src/templates/opencode/plugins/inject-chitking-context.js`, remove:
```js
export { computeHash, STAGE_DIRECTIVES, buildActiveDirective };
```

Keep only:
```js
export default async ({ directory }) => { ... }
```

### 2. Rewrite tests to use factory function

Update `test/templates/plugin.test.ts` to test via the factory:
- Import the default export: `import createHooks from "../../src/templates/opencode/plugins/inject-chitking-context.js"`
- Call `const hooks = await createHooks({ directory: tempDir })`
- Trigger `hooks["chat.message"]({ sessionID: "test" }, output)` and verify `output.parts[0].text`
- For `CHITKING_PROACTIVE=0` test: set env before calling factory
- For first-turn vs subsequent: use different sessionIDs

### 3. Rebuild + re-init Rible.jl

After the fix: `pnpm build`, delete old plugin in Rible.jl, re-run `chitking init`.

## Acceptance Criteria

* [ ] Plugin template has ONLY `export default` (no named exports)
* [ ] Tests rewritten to use factory function (no direct function imports)
* [ ] `pnpm build && pnpm test && pnpm lint && pnpm typecheck` pass
* [ ] Version bumped
