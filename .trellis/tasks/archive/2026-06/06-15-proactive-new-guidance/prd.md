# brainstorm: proactive post-new guidance + hash-based thread reload

## Goal

After `chitking new`, the agent in the chat should proactively guide the user and suggest potential ideas (Theory Brief, Current Claim, Capability Gap, etc.) derived from `research/project.md`, instead of waiting for the user to manually edit `thread.md`. Manual editing becomes the exception (when the user wants direct intervention), not the default.

In parallel, the OpenCode context-injection plugin should hash-track `thread.md` (and possibly `project.md` / `active.yaml`) so that when any party edits the file mid-session, the plugin detects the change and signals the agent to re-read, ensuring the agent always works from the most up-to-date content.

## What I already know

* `chitkingNew` (src/commands/chitking.ts:1063) creates `thread.md` with empty section headers (`REQUIRED_THREAD_SECTIONS` joined as bare `## <name>\n`), sets active thread, logs "Created and focused research thread", auto-dispatches role packets unless `--no-dispatch`.
* `REQUIRED_THREAD_SECTIONS` (src/commands/chitking.ts:98): Theory Brief, Current Claim, Capability Gap, Verification Obligations, Evidence, Failed Paths, Next Safe Actions, Decisions & Maturity History.
* The OpenCode plugin `src/templates/opencode/plugins/inject-chitking-context.js`:
  - `chat.message` hook prepends a `<chitking-breadcrumb>` block to every non-role-agent main-chat turn. Today the breadcrumb carries only metadata (active thread, maturity, readiness, safe reminders) — no body content, no proactive suggestions.
  - `loadChitkingState` reads `active.yaml`, `config.yaml`, `project.md`, and `thread.md` fresh via `readFileSync` on every hook invocation. So the plugin always sees the latest on-disk state — but the **chat agent's context window** can still hold stale body content from a prior `read()` call.
  - No hashing, no change detection, no "thread was edited since you last saw it" signal.
* `defaultThreadBody()` produces only empty `## Section` headers — no scaffolding text, no prompts.
* Demo fixture `demo/research/contact-stability/thread.md` shows what a *filled-in* thread looks like; new threads start blank.

## Assumptions (temporary)

* The user wants plugin-side (hook) behavior changes, not a new CLI command for drafting. (To confirm.)
* "Proactive guidance" means the agent in main chat, after a fresh `new`, takes initiative to draft section content conversationally — not that the CLI itself prints suggested content.
* The hash mechanism is per-session in plugin process memory (not persisted across sessions); cross-session staleness is out of scope.
* Manual editing is still fully supported — the hash check just ensures the agent notices and re-reads.

## Model Rethink (in progress)

User insight: **readiness is per-stage** ("ready to proceed to next stage"), **maturity evaluates the whole thread** (holistic quality, orthogonal to stage position). This changes the tier logic and requires a model redesign.

Proposed three orthogonal concepts:
- **Stage** — position on the research circle (today's `maturity_ladder` values become stage names): seed, briefed, gap-identified, specified, verification-planned, implementation-ready, evidence-recorded, synthesis-ready. Loops back to seed after synthesis.
- **Readiness** — per-stage gate (1-5). Resets when stepping to a new stage. Means "ready to advance to next stage."
- **Maturity** — whole-thread holistic quality: nascent → developing → established → mature. Independent of stage. Evaluated by looking at the entire thread body.

### Cycle-end behavior (user-confirmed)

At cycle end (after synthesis), the agent guides the user to choose:
1. **Archive** the thread (research concluded): `chitking archive`
2. **Start new thread(s)** from synthesis insights (branching): multiple `chitking new`
3. **Iterate** on the existing thread (supersede — archive + create new simultaneously, carrying forward context): new operation, e.g. `chitking iterate` or `chitking new --from <thread>`

### Agent is ALWAYS active — no passive tier

User-confirmed: the agent is always active at every stage. There is no passive breadcrumb tier. The breadcrumb becomes a **stage-appropriate active directive** at all times — parameterized by stage + readiness + maturity, it always tells the agent what to do next.

This collapses the tier model into a single function: `buildActiveDirective(stage, readiness, maturity)` that produces the right guidance for wherever the thread is:
- seed + nascent: "Draft starter content from project.md"
- briefed: "Review theory brief, identify gaps"
- gap-identified: "Suggest verification approaches"
- specified: "Review verification obligations"
- verification-planned: "Suggest implementation approaches"
- implementation-ready: "Help execute next safe action"
- evidence-recorded: "Analyze evidence, suggest synthesis directions"
- synthesis-ready: "Draft synthesis, propose cycle-end action (archive/new/iterate)"

## Scope: TOO LARGE for one task — must split

This task now spans: circular model redesign + stage/readiness/maturity schema + `step`/`assess`/`iterate` commands + always-active plugin directive + hash-based reload + cycle-end operations. Must decompose.

## Outcome: Design record → split into implementation tasks

This brainstorm converged on a new research lifecycle model. Archived as a design record. Implementation split into:

1. **`06-15-circular-maturity-model`** (foundation) — rename `maturity`→`stage` (circular position), repurpose `readiness` (per-stage gate, resets on step), add `maturity` (whole-thread holistic). Update config, frontmatter, `step`, role gates, demo, tests.
2. **`06-15-assess-and-iterate`** (depends on 1) — `chitking assess` (heuristic content evaluation → recommend readiness/maturity) + `chitking iterate` (supersede: archive + new with inherited context).
3. **`06-15-always-active-plugin`** (depends on 1) — replace passive breadcrumb with `buildActiveDirective(stage, readiness, maturity)`, hash-based file reload for thread.md/project.md/active.yaml.

## Decisions

* **Q1 (scope):** Plugin-injected directive. Extend `inject-chitking-context.js`'s `chat.message` breadcrumb so that its *content* adapts to thread state — proactive when fresh, passive when matured. The plugin itself stays LLM-free and read-only; it just steers the chat agent with state-appropriate instructions.
* **Q2 (hash scope & behavior):** Hash **all three** files (`thread.md` + `project.md` + `active.yaml`) using a module-level `Map<absolutePath, hash>` in the plugin (per-session, not persisted). On any hash diff between turns, inject a per-file warning line into the breadcrumb (e.g., `⚠️ thread.md changed since last turn — re-read before acting.`, `⚠️ active.yaml changed — active thread may differ from cached.`). Multiple changes → multiple lines. Best-effort, read-only; the agent decides whether the change matters and recognizes its own writes.
* **Q3 (reframed):** No separate `<chitking-fresh-thread>` block. There is ONE breadcrumb, and its *content* adapts by thread freshness (maturity + readiness + section fullness). Tiers:
  - **Tier A — truly fresh** (`maturity: seed` + `readiness: 1` + all body sections empty): breadcrumb instructs the agent to proactively draft starter content for each empty section based on `research/project.md`, and ask the user which to accept.
  - **Tier B — partially filled** (`maturity: seed` + some sections have content, OR `readiness` still low): lighter breadcrumb — note which sections are still empty, offer to help on request. Not pushy.
  - **Tier C — matured** (`maturity` past `seed`, or all sections filled): today's passive breadcrumb — metadata + safe reminders only.
  - **Opt-out:** `CHITKING_PROACTIVE=0` env var suppresses Tier A's proactive instructions, falling back to Tier C passive breadcrumb. Hash warnings still fire. Matches existing `TRELLIS_HOOKS=0` / `TRELLIS_DISABLE_HOOKS=1` pattern.

## Open Questions

* Q4 (tier boundary precision) — confirm the exact signals that pick the tier.

## Requirements (evolving)

* After `chitking new <title>`, the main chat agent must proactively offer concrete starter content for the empty thread sections, derived from `research/project.md`.
* Manual editing of `thread.md` remains supported and is the path for "direct intervention".
* The plugin must detect when `thread.md` (and possibly `project.md` / `active.yaml`) changes between chat turns and signal the agent to re-read.

## Acceptance Criteria (evolving)

* [ ] After `chitking new`, the next main-chat turn contains proactive section suggestions (not just a passive breadcrumb).
* [ ] Editing `thread.md` between two chat turns causes the plugin to surface a "thread changed, re-read" signal.
* [ ] Plugin remains read-only (no mutation of Chitking state).
* [ ] Hash tracking is best-effort and degrades gracefully if state cannot be read.
* [ ] `pnpm build && pnpm test && pnpm lint && pnpm typecheck` all pass.

## Definition of Done (team quality bar)

* Tests added/updated (unit/integration where appropriate).
* Lint / typecheck / CI green.
* Docs/notes updated if behavior changes.
* Plugin template change verified against demo regeneration test (`test/demo/demo.test.ts`).

## Out of Scope (explicit)

* Auto-writing section content to `thread.md` without user confirmation (the agent proposes; the human accepts or edits).
* Cross-session staleness tracking (persisted hash store under `.chitking/`).
* Codex adapter parity (OpenCode plugin only for MVP — extend later).

## Technical Notes

* Plugin is at `src/templates/opencode/plugins/inject-chitking-context.js`; the same file is copied to `dist/templates/...` by `scripts/copy-templates.js`. Demo regeneration test in `test/demo/demo.test.ts` round-trips the plugin.
* The plugin has no persistent module-level state across process boundaries; in-process caching via a WeakMap or module-level Map keyed by absolute file path is acceptable.
* `chitkingNew` already emits a stdout line ("Created and focused research thread: <slug>") that could be used as a signal — but the plugin runs in the OpenCode process, not the chitking CLI process, so it can't see stdout. The plugin must detect "freshly created thread" via file state (empty sections + readiness 1 + maturity seed).
