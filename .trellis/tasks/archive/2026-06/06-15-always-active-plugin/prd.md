# Always-Active Plugin Directive + Hash-Based File Reload

## Goal

Replace the OpenCode plugin's passive breadcrumb with a stage-appropriate **active directive** that always tells the agent what to do next, parameterized by `stage`, `readiness`, and `maturity`. Add hash-based file change detection so the agent knows when `thread.md`, `project.md`, or `active.yaml` changed between turns.

## Decisions (from brainstorm design record)

* **Always active, no passive tier.** The breadcrumb never becomes just metadata. It always includes an active directive.
* **Hash all three files** (`thread.md` + `project.md` + `active.yaml`) via module-level `Map<path, hash>`. Per-session, not persisted. On hash diff, inject per-file warning line.
* **`CHITKING_PROACTIVE=0`** env var suppresses the active directive (falls back to minimal metadata-only breadcrumb). Hash warnings still fire.
* **Directive parameterized by** `buildActiveDirective(stage, readiness, maturity)` — one function, no tier blocks.

## Requirements

### 1. Active directive (replaces `buildMainBreadcrumb`)

Replace the current passive breadcrumb (`buildMainBreadcrumb`) with `buildActiveDirective(directory)` that produces stage-appropriate guidance. The directive text per stage:

| Stage | Directive |
|---|---|
| `seed` | "Thread is at seed stage. Read `research/project.md`, then proactively draft starter content for each empty section (Theory Brief, Current Claim, Capability Gap, Verification Obligations, Next Safe Actions). Present drafts conversationally; ask the user which to accept before writing to thread.md. Suggest running `chitking assess` to check readiness to advance." |
| `briefed` | "Thread has a theory brief. Review it for clarity and gaps. Suggest refinements to the Current Claim and Capability Gap sections. Suggest running `chitking assess` to check readiness to advance." |
| `gap-identified` | "Thread has an identified capability gap. Suggest verification approaches and help draft Verification Obligations. Suggest running `chitking assess` to check readiness to advance." |
| `specified` | "Thread has verification obligations specified. Review them for completeness and suggest protocol improvements. Suggest running `chitking assess` to check readiness to advance." |
| `verification-planned` | "Thread has a verification protocol. Suggest implementation approaches for the next safe action. Suggest running `chitking assess` to check readiness to advance." |
| `implementation-ready` | "Thread is ready for implementation. Help execute the approved next safe action. Record evidence with `chitking record --type evidence`. Suggest running `chitking assess` to check readiness to advance." |
| `evidence-recorded` | "Thread has recorded evidence. Analyze the evidence against verification obligations. Suggest synthesis directions or additional experiments. Suggest running `chitking assess` to check readiness to advance." |
| `synthesis-ready` | "Thread is ready for synthesis. Draft synthesis conclusions from recorded evidence and failed paths. Then guide the user to choose: `chitking archive` (conclude), `chitking new <title>` (branch), or `chitking iterate <title>` (supersede with new cycle)." |
| unknown/missing | Fallback to minimal metadata breadcrumb. |

The directive is prepended with a metadata header (active thread, stage, maturity, readiness) and appended with hash warnings if any files changed.

### 2. Hash-based file change detection

Module-level `Map<string, string>` (`fileHashCache`) keyed by absolute file path. On each `chat.message` hook:
1. Compute hash of `thread.md`, `project.md`, `active.yaml` (simple content hash — use `crypto.createHash('sha256')` or a fast string hash).
2. Compare against `fileHashCache`.
3. If any differ, append warning lines to the breadcrumb:
   - `⚠️ thread.md changed since last turn — re-read before acting.`
   - `⚠️ project.md changed since last turn — re-read before acting.`
   - `⚠️ active.yaml changed — active thread may differ from cached.`
4. Update `fileHashCache` with current hashes.
5. First turn (no prior hash) → no warning, just store.

### 3. `CHITKING_PROACTIVE=0` opt-out

If `process.env.CHITKING_PROACTIVE === "0"`:
- Skip the active directive text (stage-specific guidance).
- Still show minimal metadata (active thread, stage, maturity, readiness).
- Hash warnings still fire.
- Matches existing `TRELLIS_HOOKS=0` / `TRELLIS_DISABLE_HOOKS=1` pattern.

### 4. Output format

```
<chitking-breadcrumb>
Active Chitking thread: <slug>
Stage: <stage> | Maturity: <maturity> | Readiness: <readiness>

<stage-specific directive text>

⚠️ thread.md changed since last turn — re-read before acting.

Safety: humans own stage/readiness/maturity; read research/project.md before thread.md; use chitking assess to evaluate progress.
</chitking-breadcrumb>
```

## Acceptance Criteria

* [ ] Plugin `chat.message` hook produces stage-appropriate active directive (not passive metadata-only).
* [ ] Each stage (seed through synthesis-ready) has a distinct directive.
* [ ] Hash tracking detects changes to thread.md/project.md/active.yaml between turns and injects warning lines.
* [ ] `CHITKING_PROACTIVE=0` suppresses directive text but keeps metadata + hash warnings.
* [ ] Plugin remains read-only (no mutation of any file).
* [ ] Hash tracking is best-effort (unreadable files → skip silently, no crash).
* [ ] First turn produces no hash warning (no prior hash to compare).
* [ ] Role-context injection (`tool.execute.before`) is unchanged.
* [ ] `pnpm build && pnpm test && pnpm lint && pnpm typecheck` pass.
* [ ] `git diff --check` clean.
* [ ] Version bumped.

## Definition of Done

* Plugin template (`inject-chitking-context.js`) updated with `buildActiveDirective`, hash tracking, and opt-out.
* Demo test updated if plugin output assertions exist.
* Unit tests for directive logic and hash detection (if feasible in test framework — plugin runs in OpenCode process, so direct unit tests may be limited; test the pure functions instead).
* Version bumped.

## Out of Scope

* Codex adapter changes (OpenCode plugin only).
* Persisted hash store (cross-session tracking).
* LLM-based directive generation (directives are static per-stage strings).
* Config-customizable directive text (hardcoded per-stage for MVP).

## Technical Notes

* Plugin is at `src/templates/opencode/plugins/inject-chitking-context.js` (copied to `dist/templates/` by `scripts/copy-templates.js`).
* Current `buildMainBreadcrumb` at line ~238 produces the passive breadcrumb. Replace with `buildActiveDirective`.
* Current `loadChitkingState` already reads all needed state. Reuse it.
* For hashing: use Node's `crypto.createHash('sha256').update(content).digest('hex')`. Import `crypto` from `node:crypto` or use a simpler hash (content length + first/last 64 chars) to avoid import complexity. Since the plugin already uses ESM imports, `import { createHash } from "node:crypto"` is clean.
* The directive text is static per stage — no LLM, no content parsing. Pure state→text mapping.
* The `tool.execute.before` hook (role context injection for chitking-* sub-agents) is UNCHANGED in this task.
