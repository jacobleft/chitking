# Session-Start Context Injection + Response Style Directive

## Goal

Inject a rich session-start context block on the first chat turn that gives the agent: (1) the full workflow overview (so it doesn't need to separately load the skill), (2) the current thread state, and (3) a response-style directive (whole-picture, not clustered). Subsequent turns use the normal breadcrumb.

Also update the chitking-workflow skill to remove stale clustering language and add the response-style guidance.

## Requirements

### 1. Session-start context block (plugin)

In `buildActiveDirective`, detect the first turn of a session by checking `fileHashCache.size === 0`. On the first turn, inject a richer `<chitking-session-start>` block instead of the normal `<chitking-breadcrumb>`.

**Session-start block format:**
```
<chitking-session-start>
Chitking research workflow: threads advance through circular stages
(seed → briefed → gap-identified → specified → verification-planned →
implementation-ready → evidence-recorded → synthesis-ready → loop to seed).
Readiness (1-5) is a per-stage gate that resets on step.
Maturity (nascent/developing/established/mature) tracks whole-thread quality.
Commands: orient (status), assess (evaluate), step (advance stage), mature
(update maturity), dispatch (role packets), record (evidence), iterate (new cycle).
Thread.md is co-owned by agent and human — write directly, hash-check first.

Thread: <slug>
Stages: [seed] briefed → ... → synthesis-ready → (loop)
Readiness: 1/5 — need ≥1 to advance to briefed ✓ ready
Maturity: nascent (whole-thread quality)

Response style: when communicating about this thread, focus on the whole
picture — current stage, readiness status, and concrete next steps. Avoid
clustering by warnings/boundaries. Be direct and actionable. Present
suggestions as a unified flow, not separate sections.

For full workflow docs: .opencode/skills/chitking-workflow/SKILL.md
</chitking-session-start>
```

**Subsequent turns:** Use the existing `<chitking-breadcrumb>` format (stage progression + readiness + maturity + directive + hash warnings + safety).

**Detection logic:** `const isFirstTurn = fileHashCache.size === 0;` at the top of `buildActiveDirective`. After the function runs (which populates the cache), subsequent calls have `fileHashCache.size > 0`.

**`CHITKING_PROACTIVE=0` opt-out:** When set, the session-start block still fires but omits the workflow overview and response-style directive (just shows metadata + hash info). This matches the existing opt-out behavior.

### 2. Update chitking-workflow skill

Update `src/templates/chitking/skills/chitking-workflow.md`:

- **Line 37** (orient description): Remove "blockers, stale packets, risky roles, and next safe actions" clustering language. Replace with: "summarizes stage progression, readiness, maturity, issues, and next steps."
- **Add a "Response Style" section** at the end:
  ```markdown
  ## Response Style
  
  When communicating with users about Chitking threads:
  - Focus on the whole picture: current stage, readiness status, and concrete next steps.
  - Avoid clustering by warnings/boundaries. Present a unified flow.
  - Be direct and actionable. Suggest commands to run, not just describe problems.
  - The agent is always active — proactively guide, don't wait to be asked.
  ```

### 3. Update tests

- `test/templates/plugin.test.ts` — add test for session-start block (first turn vs subsequent)
- Test that first turn contains `<chitking-session-start>` and workflow overview text
- Test that subsequent turns contain `<chitking-breadcrumb>` (not session-start)
- Test `CHITKING_PROACTIVE=0` on first turn (metadata only, no workflow overview)

## Acceptance Criteria

* [ ] First chat turn of a session injects `<chitking-session-start>` with workflow overview + thread state + response style directive.
* [ ] Subsequent turns inject `<chitking-breadcrumb>` (unchanged from current behavior).
* [ ] `CHITKING_PROACTIVE=0` suppresses workflow overview + style directive on first turn.
* [ ] chitking-workflow skill updated (no clustering language, response style section added).
* [ ] `pnpm build && pnpm test && pnpm lint && pnpm typecheck` pass.
* [ ] `git diff --check` clean.
* [ ] Version bumped.

## Out of Scope

* Changes to `tool.execute.before` (role context injection).
* Changes to orient/show CLI output (already redesigned).
* Codex adapter (OpenCode plugin only).
* Persisted session-start flag (fileHashCache.size is sufficient).

## Technical Notes

* Plugin at `src/templates/opencode/plugins/inject-chitking-context.js`.
* `fileHashCache` is a module-level `Map` — empty on first call, populated after.
* The session-start block is longer than the breadcrumb but only fires once per session.
* The workflow overview text is static (same as the condensed skill content).
* The response-style directive steers the agent's communication style for the entire session.
