---
name: chitking-workflow
description: Trigger when working in a Chitking repo, using chitking commands, interpreting Chitking workflow/state files, or handling research threads, maturity, readiness, roles, or generated packets.
---
# Chitking Workflow Skill

Use this skill before acting in a repository that contains Chitking files or when a user mentions Chitking, research threads, maturity, readiness, role packets, or Chitking source-of-truth files.

## Core Model

Chitking is a lightweight research workflow built from durable Markdown source files, small YAML state/config files, generated role packets, and optional platform adapters.

Humans own research direction, maturity, and readiness checkpoints. Agents may inspect and report findings, but must not silently change source-of-truth files or maturity/readiness values unless the user or calling workflow explicitly instructs them to do so.

## Durable State and Source of Truth

- `.chitking/active.yaml` stores the active-thread pointer used by commands that operate on the current thread.
- `.chitking/config.yaml` stores the maturity ladder, readiness thresholds, role definitions, role gates, warnings, and incomplete-project markers.
- `.chitking/roles/*.md` stores canonical, tool-neutral role contracts. These contracts define role objectives, gates, warnings, stop conditions, required inputs, and universal boundaries.
- `research/project.md` is the project-level source of truth. Read it before thread-specific work and do not silently rewrite its assumptions, verification standards, or non-goals.
- `research/<thread>/thread.md` is the thread-level source of truth. Its frontmatter records the thread slug, maturity, readiness, readiness source, recorded commits, and update time. Its sections record the theory brief, current claim, capability gap, verification obligations, evidence, failed paths, next safe actions, and maturity history.

## Generated Files and Platform Adapters

- `research/<thread>/context/*.yaml` files are generated role packets/cache from `chitking pack --role <role>`. They point back to source files and can become stale when `thread.md` changes.
- `.opencode/agents/chitking-*.md` files are OpenCode role adapters. They embed the matching canonical role contract directly and set platform permissions for each role.
- Platform adapters are conveniences, not source of truth. If an adapter conflicts with `.chitking/roles/*.md`, treat the canonical role contract and Chitking config as authoritative and ask for human direction before changing durable files.

## Command Boundaries

- `chitking orient` reads the active thread, source files, config, generated packets, and Git activity to summarize maturity, readiness, blockers, stale packets, risky roles, and next safe actions. Use it to orient; do not treat it as permission to mutate files.
- `chitking step` changes maturity/readiness and records the reason in `thread.md`. Because humans own maturity/readiness, only run or emulate this command when explicitly instructed by the user or calling workflow.
- `chitking pack --role <role>` regenerates `research/<thread>/context/<role>.yaml` for a role. Packets are generated cache and should not replace reading `research/project.md` and `research/<thread>/thread.md`.
- `chitking record --type <type> --text "..."` appends factual output to the active thread. Use it only when the user or calling workflow asks you to record evidence, failures, decisions, or revisions.

## Agent Operating Rules

1. Start by identifying the active thread from `.chitking/active.yaml` when the user has not named a thread.
2. Read `research/project.md` before `research/<thread>/thread.md`.
3. Treat maturity/readiness as human checkpoints. Recommend changes when appropriate, but do not silently apply them.
4. Treat generated context packets as cache. Regenerate them with `chitking pack` when stale rather than editing them by hand.
5. Respect role contracts and stop conditions before acting as a specialized Chitking role.
6. Ask before changing source-of-truth files unless the user explicitly requested that change.
