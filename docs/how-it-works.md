# How Chitking Works

This page walks through the normal Chitking research flow from a fresh session to a completed research cycle. It covers what files are read, what commands write, what the plugin injects, and how the circular stage model works.

For a quick command reference, see the [README](../README.md).

---

## 1. A session opens

When you open a repository that has been initialized with Chitking, the OpenCode plugin at `.opencode/plugins/inject-chitking-context.js` loads automatically. On your first chat message it injects a `<chitking-session-start>` block containing:

- A short overview of the circular stage model.
- The active thread name.
- Current stage progression.
- Current readiness and threshold.
- Current whole-thread maturity.
- Response-style guidance for the agent.
- Any hash-change warnings.

To produce this block, the plugin reads:

| File | Purpose |
|------|---------|
| `.chitking/active.yaml` | Points to the active research thread. |
| `.chitking/config.yaml` | Stages, thresholds, maturity levels, role definitions. |
| `research/project.md` | Project-level assumptions, scope, and non-goals. |
| `research/<thread>/thread.md` | Thread-level source of truth (frontmatter + sections). |

If no thread is active, the breadcrumb tells you to run `chitking new <title>` or `chitking focus <thread>`.

---

## 2. Each prompt gets current state

After the first turn, every subsequent user message gets a lighter `<chitking-breadcrumb>` that includes:

- Active thread name.
- Stage progression with the current stage in brackets, e.g. `seed → [briefed] → gap-identified → ...`.
- Readiness line, e.g. `Readiness: 3/5 — need ≥2 to advance to gap-identified ✓ ready`.
- Whole-thread maturity, e.g. `Maturity: developing (whole-thread quality)`.
- A stage-specific directive (unless `CHITKING_PROACTIVE=0`).
- Hash-change warnings if `thread.md`, `project.md`, or `active.yaml` changed between turns.
- A safety reminder that humans own stage/readiness/maturity transitions.

The breadcrumb is read-only. It never edits Chitking state. Its purpose is to keep the agent and the human aligned on the current research posture before any action is taken.

---

## 3. Initialization creates the workspace

Run `chitking init` once per project. It creates the following structure:

```text
.
├── .chitking/
│   ├── active.yaml          # active thread pointer
│   ├── config.yaml          # stages, thresholds, maturity, roles
│   └── roles/
│       ├── plan.md
│       ├── dreamer.md
│       ├── build.md
│       ├── predict.md
│       ├── verify.md
│       ├── synthesize.md
│       ├── review.md
│       └── oracle.md
├── research/
│   └── project.md           # project-level source of truth
├── .opencode/
│   ├── agents/
│   │   ├── chitking-plan.md
│   │   ├── chitking-dreamer.md
│   │   ├── chitking-build.md
│   │   ├── chitking-predict.md
│   │   ├── chitking-verify.md
│   │   ├── chitking-synthesize.md
│   │   ├── chitking-review.md
│   │   └── chitking-oracle.md
│   ├── commands/
│   │   ├── ck-init.md
│   │   ├── ck-new.md
│   │   ├── ck-step.md
│   │   └── ...              # one wrapper per ck-* command
│   ├── skills/
│   │   └── chitking-workflow/
│   │       └── SKILL.md
│   └── plugins/
│       └── inject-chitking-context.js
└── .codex/
    └── skills/
        ├── ck-init/
        │   └── SKILL.md
        ├── ck-new/
        │   └── SKILL.md
        └── ...              # Codex slash-command wrappers
```

What each generated file does:

| Path | Purpose |
|------|---------|
| `.chitking/active.yaml` | Tracks which thread is currently focused. |
| `.chitking/config.yaml` | Editable schema of stages, readiness thresholds, maturity criteria, role contracts, and project-incomplete markers. |
| `.chitking/roles/*.md` | Canonical, tool-neutral role contracts. These are source of truth for role behavior. |
| `research/project.md` | Human-editable project brief: problem, scope, assumptions, non-goals. |
| `.opencode/agents/chitking-*.md` | OpenCode role adapters that embed the canonical contracts and set platform permissions. |
| `.opencode/commands/ck-*.md` | Slash-command wrappers around the Chitking CLI. |
| `.opencode/skills/chitking-workflow/SKILL.md` | The workflow skill agents read before acting on Chitking files. |
| `.opencode/plugins/inject-chitking-context.js` | Injects session-start blocks, breadcrumbs, and role context. |
| `.codex/skills/ck-*/SKILL.md` | Codex slash-command wrappers around the same CLI commands. |

`chitking init` is safe to re-run: it will not overwrite existing generated files.

---

## 4. Thread creation starts a research path

Run `chitking new "<title>"` to create a research thread. For example:

```bash
chitking new "Contact stability under finite strain"
```

This creates `research/contact-stability/thread.md` with:

- A `context/` subdirectory for generated role packets.
- Frontmatter:

  ```yaml
  thread: contact-stability
  title: Contact stability under finite strain
  stage: seed
  maturity: nascent
  readiness: 1
  readiness_source: human
  recorded_commits: []
  updated_at: ...
  ```

- Empty required sections:
  - Theory Brief
  - Current Claim
  - Capability Gap
  - Verification Obligations
  - Predictions
  - Evidence
  - Failed Paths
  - Next Safe Actions
  - Decisions & Maturity History

The new thread is automatically focused in `.chitking/active.yaml`, and role packets are dispatched unless you pass `--no-dispatch`.

---

## 5. The circular stage model

Chitking threads advance through eight stages in a circle:

```text
seed → briefed → gap-identified → specified → verification-planned → implementation-ready → evidence-recorded → synthesis-ready → (loop to seed)
```

The circle represents the research lifecycle. After synthesis, the next cycle starts back at `seed` with new understanding.

| Stage | Purpose |
|-------|---------|
| `seed` | Initial idea or question. Draft a theory brief and current claim. |
| `briefed` | Theory brief is in place. Identify the capability gap. |
| `gap-identified` | Gap is explicit. Draft verification obligations. |
| `specified` | Obligations are listed. Plan concrete next safe actions. |
| `verification-planned` | Verification protocol is defined. Prepare to execute. |
| `implementation-ready` | Ready to run the approved next safe action. |
| `evidence-recorded` | Evidence has been captured. Analyze against obligations. |
| `synthesis-ready` | Enough evidence exists to synthesize conclusions. |

Stage advancement is explicit. Agents may recommend, but only the human (or an explicit command invocation) moves the thread forward.

---

## 6. Readiness is a per-stage gate

Each stage has a readiness score from 1 to 5. Readiness measures how prepared the thread is to leave the current stage, not the overall quality of the research.

Key rules:

- Readiness resets to 1 on every `chitking step`.
- The threshold to advance is configured in `.chitking/config.yaml` under `stage_advancement`.
- `chitking step` does not require readiness to be above the threshold, but `chitking assess` reports whether the threshold is met.

Default thresholds from the generated config:

| Stage | Threshold |
|-------|-----------|
| `seed` | 1 |
| `briefed` | 1 |
| `gap-identified` | 2 |
| `specified` | 2 |
| `verification-planned` | 3 |
| `implementation-ready` | 4 |
| `evidence-recorded` | 4 |
| `synthesis-ready` | 5 |

Example readiness line from `chitking orient`:

```text
Readiness: 3/5 — need ≥2 to advance to gap-identified ✓ ready
```

Readiness is set by humans, not inferred silently. The `readiness_source` field in the frontmatter records this explicitly.

---

## 7. Maturity tracks whole-thread quality

Maturity is orthogonal to stage. It tracks holistic quality across the whole thread:

```text
nascent → developing → established → mature
```

- `nascent`: thread exists, little content yet.
- `developing`: theory brief and claim are taking shape.
- `established`: evidence and failed paths are recorded.
- `mature`: the thread has completed at least one full cycle.

Maturity is changed explicitly with:

```bash
chitking mature --to established --reason "Evidence and failed paths are now recorded."
```

`chitking step` does not change maturity. `chitking assess` recommends maturity changes based on criteria in `.chitking/config.yaml`.

---

## 8. Assessment evaluates content

`chitking assess [thread]` reads the thread body and checks structural criteria from `.chitking/config.yaml`. It is read-only and recommend-only.

The check types are:

| Check | Meaning |
|-------|---------|
| `non-empty` | Section has content. |
| `min-bullets` | Section contains at least N `-` bullets. |
| `min-words` | Section contains at least N words. |
| `history_contains` | Decisions & Maturity History contains a given phrase. |

Example output:

```text
Assessment for thread: contact-stability

Stage: briefed (readiness 2, maturity nascent)

Stage advancement criteria (to advance from briefed):
  ✓ Capability Gap: non-empty
→ Readiness to advance: 1/1 criteria met — ready to step

Maturity criteria (for next level: developing):
  ✓ Theory Brief: ≥20 words (34 found)
  ✓ Current Claim: non-empty
→ Maturity recommendation: developing (2/2 criteria met)
→ To apply: chitking mature --to developing --reason "..."

Suggested next actions:
  - chitking step --to gap-identified --reason "..."
```

`chitking assess` never edits the thread. It only reports pass/fail and recommends commands.

---

## 9. Role dispatch prepares context

`chitking dispatch [--role <role>]` generates `research/<thread>/context/<role>.yaml` packets. Eight roles are configured by default:

| Role | Min stage | Min readiness | Purpose |
|------|-----------|---------------|---------|
| `plan` | `briefed` | 1 | Turn theory brief and gap into a safe research plan. |
| `dreamer` | `seed` | 1 | Generate hypotheses, analogies, and candidate mechanisms. |
| `build` | `implementation-ready` | 4 | Implement the approved next safe action. |
| `predict` | `gap-identified` | 2 | Propose a falsifiable experiment with a cited source. |
| `verify` | `verification-planned` | 3 | Check evidence against verification obligations. |
| `synthesize` | `synthesis-ready` | 5 | Synthesize stable conclusions from evidence and failed paths. |
| `review` | `specified` | 2 | Review thread consistency, risk, and readiness evidence. |
| `oracle` | `specified` | 2 | Provide explicit readiness/stage judgment for human consideration. |

Each packet contains:

- Role name and active thread.
- Current stage, maturity, and readiness.
- Paths to `research/project.md` and `research/<thread>/thread.md`.
- The role's objective and stop conditions.
- Gate warnings if the thread is below the role's minimum stage or readiness.
- Utility commands for recording evidence, failures, decisions, and revisions.

Packets are generated cache, not source of truth. They can become stale when `thread.md` changes; `chitking orient` warns about stale packets, and `chitking dispatch` regenerates them.

Role packets are auto-dispatched after `chitking new`, `chitking focus`, `chitking step`, `chitking mature`, and `chitking iterate` unless `--no-dispatch` is passed.

---

## 10. Recording evidence

Use `chitking record` to append durable content to the active thread:

```bash
chitking record --type evidence --text "Ran benchmark X; observed 12% improvement."
chitking record --type failure --text "Approach Y failed because Z."
chitking record --type decision --text "Selected protocol P based on Q."
chitking record --type revision --text "Updated claim to R."
chitking record --type prediction --text "Claim: ... Source: ... Predicted Effect: ... Falsification Criterion: ..."
```

The `--type` maps to a section:

| Type | Section |
|------|---------|
| `evidence` | Evidence |
| `failure` | Failed Paths |
| `decision` | Decisions & Maturity History |
| `revision` | Current Claim |
| `prediction` | Predictions |

Optionally attach a commit with `--commit <ref>`. Recorded content is durable research memory and survives the chat session.

---

## 11. Stage advancement

Advance the thread with `chitking step`:

```bash
# Move to the next stage in the circle, resetting readiness to 1.
chitking step

# Jump to a specific stage with a reason.
chitking step --to verification-planned --reason "Obligations are clear."

# Advance and set readiness in one command.
chitking step --to implementation-ready --readiness 4 --reason "Plan approved."
```

Rules:

- `--to` requires `--reason`.
- If no `--to` is given and the thread is at `synthesis-ready`, stepping loops back to `seed`.
- Readiness resets to 1 by default, or to the value provided with `--readiness`.
- Every step appends an entry to `Decisions & Maturity History`.

Update whole-thread maturity with `chitking mature`:

```bash
chitking mature --to developing --reason "Theory brief and claim are now substantial."
```

Both commands require explicit human consent because humans own stage/readiness/maturity transitions.

---

## 12. Cycle end: archive, branch, or iterate

When a thread reaches `synthesis-ready` and synthesis is complete, you have three options:

| Option | Command | Result |
|--------|---------|--------|
| Conclude | `chitking archive <thread> --yes` | Marks the thread archived. It disappears from `chitking list` and cannot be focused until restored. |
| Branch | `chitking new "<title>"` | Starts a new thread from the insights of the completed cycle. The old thread remains active until you archive or focus elsewhere. |
| Supersede | `chitking iterate "<title>"` | Archives the active thread and creates a successor thread with a `predecessor` link in one step. The new thread starts at `seed`/`nascent`/`readiness 1`. |

Example:

```bash
chitking iterate "Contact stability under thermal coupling"
```

This archives the current thread and creates `research/contact-stability-under-thermal-coupling/thread.md` with `predecessor: <old-slug>` and a history entry noting the iteration.

---

## 13. What survives the session

When the chat ends, the following durable files remain:

| Location | What lives there | Survives session? |
|----------|------------------|-------------------|
| `.chitking/` | `active.yaml`, `config.yaml`, `roles/*.md` | Yes. Product state. |
| `research/project.md` | Project-level brief and scope | Yes. User content. |
| `research/<thread>/thread.md` | Thread frontmatter and all sections | Yes. User content, source of truth. |
| `research/<thread>/context/*.yaml` | Generated role packets | Yes, but may become stale. Cache. |
| `.opencode/` | Agents, commands, skills, plugin | Yes. Generated adapters. |
| `.codex/` | Slash-command skill wrappers | Yes. Generated adapters. |

The next session reads these files to resume. Chat history is not required; the durable files carry the research state forward.

---

## 14. Plugin architecture

The OpenCode plugin `.opencode/plugins/inject-chitking-context.js` has three hooks:

### `chat.message`

Injects context into every user chat turn:

- First turn in a session → `<chitking-session-start>` block.
- Subsequent turns → `<chitking-breadcrumb>`.
- Skips messages from agents matching `chitking-.*` to avoid redundant context in role tasks.

### `tool.execute.before`

Intercepts `Task` tool calls whose subagent name matches `chitking-<role>`. It prepends a `<chitking-role-context>` block to the task prompt containing:

- Role name.
- Active thread, stage, maturity, readiness.
- Source file paths.
- Packet path (or a note that it is missing).
- Role objective.
- Gate warnings.
- Safety boundaries.

### `event`

Listens for `session.compacted` and clears the per-session `processedSessions` set, so the next turn after compaction gets a fresh session-start block.

### Hash tracking

The plugin keeps a module-level `fileHashCache`. On each turn it computes a simple hash of:

- `research/<thread>/thread.md`
- `research/project.md`
- `.chitking/active.yaml`

If a file changed since the previous turn, the breadcrumb includes a warning to re-read before acting. This prevents agents from accidentally clobbering human edits made between turns.

### Proactive mode

Set `CHITKING_PROACTIVE=0` to suppress the active stage directive and workflow overview in injected blocks. State facts (thread, stage, readiness, maturity) are still shown.

---

## Summary

Chitking keeps research state explicit, durable, and human-controlled:

1. **Session start** — plugin injects current thread state.
2. **Every prompt** — breadcrumb keeps state visible.
3. **`chitking init`** — scaffolds state, config, and adapters.
4. **`chitking new`** — creates a thread at `seed`/`nascent`/`readiness 1`.
5. **Circular stages** — eight stages that loop back to `seed` after synthesis.
6. **Per-stage readiness** — gates advancement; resets on `step`.
7. **Whole-thread maturity** — tracks holistic quality separately.
8. **`chitking assess`** — read-only evaluation with recommendations.
9. **`chitking dispatch`** — generates role packets as cache.
10. **`chitking record`** — appends durable evidence, failures, decisions, revisions.
11. **`chitking step` / `chitking mature`** — explicit transitions logged in history.
12. **Cycle end** — archive, branch with `new`, or supersede with `iterate`.
13. **Durable files** — survive the session in `.chitking/` and `research/`.
14. **Plugin** — injects session blocks, breadcrumbs, and role context without mutating state.
