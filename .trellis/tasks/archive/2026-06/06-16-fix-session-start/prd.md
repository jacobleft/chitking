# Fix Session-Start Injection: Use sessionID Not HashCache Size

## Problem

The session-start context injection doesn't work because it uses `fileHashCache.size === 0` to detect the first turn of a session. This only works ONCE PER PROCESS LIFETIME — once any file is hashed (which happens on the first `buildActiveDirective` call regardless of session), `size > 0` forever, and the session-start block never fires again.

## Root Cause

Trellis's `session-start.js` plugin uses `input.sessionID` + `contextCollector.isProcessed(sessionID)` for per-session tracking. Our plugin ignores `input.sessionID` entirely and uses the wrong mechanism.

## Fix

Follow the Trellis pattern (`~/projects/trellis/.opencode/plugins/session-start.js`):

### 1. Add per-session tracking

Replace `fileHashCache.size === 0` detection with a module-level `Set<string>` of processed session IDs:

```js
const processedSessions = new Set()
```

### 2. Use `input.sessionID` in `chat.message` hook

In the `chat.message` hook, pass `input.sessionID` to `buildActiveDirective`:

```js
"chat.message": async (input, output) => {
  try {
    // ... existing env/repo checks ...
    const sessionID = input.sessionID || "default"
    const isFirstTurn = !processedSessions.has(sessionID)
    prependTextPart(output, buildActiveDirective(directory, { isFirstTurn }))
    if (isFirstTurn) {
      processedSessions.add(sessionID)
    }
  } catch { ... }
}
```

### 3. Add `event` hook for compaction

Like Trellis, handle `session.compacted` to clear the processed flag:

```js
event: ({ event }) => {
  try {
    if (event?.type === "session.compacted" && event?.properties?.sessionID) {
      processedSessions.delete(event.properties.sessionID)
    }
  } catch { }
}
```

### 4. Pass `isFirstTurn` to `buildActiveDirective`

Change `buildActiveDirective(directory)` to `buildActiveDirective(directory, options = {})` where `options.isFirstTurn` controls whether to emit `<chitking-session-start>` or `<chitking-breadcrumb>`.

Remove the `fileHashCache.size === 0` check inside `buildActiveDirective`.

### 5. Update tests

Update `test/templates/plugin.test.ts` to test with explicit `isFirstTurn` parameter instead of relying on hash cache state.

## Acceptance Criteria

* [ ] Plugin uses `input.sessionID` + `Set<string>` for per-session tracking
* [ ] First message in a new session fires session-start block
* [ ] Subsequent messages in same session fire breadcrumb
* [ ] `session.compacted` event clears the processed flag
* [ ] `fileHashCache.size === 0` detection removed
* [ ] `pnpm build && pnpm test && pnpm lint && pnpm typecheck` pass
* [ ] Version bumped

## Technical Notes

* Reference: `~/projects/trellis/.opencode/plugins/session-start.js`
* The `event` hook is returned alongside `chat.message` and `tool.execute.before` in the plugin factory's return object.
* `input.sessionID` is available in OpenCode's `chat.message` hook (confirmed by Trellis's usage).
