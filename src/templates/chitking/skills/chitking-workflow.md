# Chitking Workflow Skill

Use this skill before acting in a repository that contains Chitking files or when a user mentions Chitking, research threads, stage, maturity, readiness, role packets, or Chitking source-of-truth files.

## Core Model

Chitking is a lightweight research workflow built from durable Markdown source files, small YAML state/config files, generated role packets, and optional platform adapters.

Humans own research direction, stage, maturity, and readiness checkpoints. Agents may inspect and report findings, but must not silently change source-of-truth files or stage/readiness/maturity values unless the user or calling workflow explicitly instructs them to do so.

## Durable State and Source of Truth

- `.chitking/active.yaml` stores the active-thread pointer used by commands that operate on the current thread.
- `.chitking/config.yaml` stores the stages, stage advancement thresholds, maturity levels, role definitions, role gates, warnings, and incomplete-project markers.
- `.chitking/roles/*.md` stores canonical, tool-neutral role contracts. These contracts define role objectives, gates, warnings, stop conditions, required inputs, and universal boundaries.
- `research/project.md` is the project-level source of truth. Read it before thread-specific work and do not silently rewrite its assumptions, verification standards, or non-goals.
- `research/<thread>/thread.md` is the thread-level source of truth. Its frontmatter records the thread slug, stage, maturity, readiness, readiness source, recorded commits, and update time. Its sections record the theory brief, current claim, capability gap, verification obligations, evidence, failed paths, next safe actions, and maturity history.

## Generated Files and Platform Adapters

- `research/<thread>/context/*.yaml` files are generated role packets/cache from `chitking dispatch [--role <role>]`. They point back to source files and can become stale when `thread.md` changes.
- `.opencode/agents/chitking-*.md` files are OpenCode role adapters. They embed the matching canonical role contract directly and set platform permissions for each role.
- `.opencode/commands/ck-*.md` and `.codex/skills/ck-*/SKILL.md` are generated slash-command wrappers around the Chitking CLI command surface.
- Platform adapters are conveniences, not source of truth. If an adapter conflicts with `.chitking/roles/*.md`, treat the canonical role contract and Chitking config as authoritative and ask for human direction before changing durable files.

## Command Boundaries

- Thread lifecycle commands are top-level: `chitking new <title> [--slug <slug>]`, `chitking list`, `chitking show [thread]`, `chitking focus <thread>`, `chitking rename <thread> <title>`, `chitking archive <thread> --yes`, `chitking restore <thread>`, and `chitking delete <thread> --yes`.
- `chitking new` creates `research/<thread>/thread.md`, creates the thread context cache directory, and focuses the new thread. Only run it when the user wants a new durable research thread.
- `chitking list` shows non-archived threads. `chitking show [thread]` summarizes the named thread or the active thread, including the source thread file and generated context cache path.
- `chitking focus <thread>` sets the active-thread pointer for an existing non-archived thread. Do not focus an archived thread; restore it first if the user asks to resume it.
- `chitking rename <thread> <title>` updates the human-readable title in `research/<thread>/thread.md` while keeping the slug/directory stable.
- `chitking archive <thread> --yes` marks a thread archived and removes it from normal list/focus behavior. The explicit `--yes` is required because this hides active durable research state from the normal workflow.
- `chitking restore <thread>` restores an archived thread. It does not require `--yes` because it is an undo/recovery operation.
- `chitking delete <thread> --yes` removes the thread's durable `research/<thread>/` directory. The explicit `--yes` is required; never delete a thread unless the user clearly requested deletion.
- `chitking orient` reads the active thread, source files, config, generated packets, and Git activity to summarize stage, maturity, readiness, blockers, stale packets, risky roles, and next safe actions. Use it to orient; do not treat it as permission to mutate files.
- `chitking step` changes stage/readiness and records the reason in `thread.md`. Because humans own stage/readiness, only run or emulate this command when explicitly instructed by the user or calling workflow.
- `chitking dispatch [--role <role>]` regenerates `research/<thread>/context/<role>.yaml` for a role (or all roles when `--role` is omitted). Packets are generated cache and should not replace reading `research/project.md` and `research/<thread>/thread.md`.
- `chitking record --type <type> --text "..."` appends factual output to the active thread. Use it only when the user or calling workflow asks you to record evidence, failures, decisions, or revisions.

## Agent Operating Rules

1. Start by identifying the active thread from `.chitking/active.yaml` when the user has not named a thread.
2. Read `research/project.md` before `research/<thread>/thread.md`.
3. Treat stage/readiness/maturity as human checkpoints. Recommend changes when appropriate, but do not silently apply them.
4. Treat generated context packets as cache. Regenerate them with `chitking dispatch` when stale rather than editing them by hand.
5. Respect role contracts and stop conditions before acting as a specialized Chitking role.
6. Ask before changing source-of-truth files or thread lifecycle state unless the user explicitly requested that change.
