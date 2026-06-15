# Chitking Product Doctrine

> **Purpose**: Keep Chitking development anchored to stable product intent when architecture, commands, and adapters change.

---

## Purpose

Chitking is a standalone research-path CLI: 哲徑, the path of thinking and research.

Its purpose is to help researchers keep research thread state, role context, maturity, readiness, and durable research memory explicit while they work.
It should make the path of inquiry easier to inspect, resume, and hand off without replacing the researcher's judgment.

---

## Goals / objectives

- Preserve durable, user-editable research context across sessions.
- Make research state explicit enough that humans and agents can see what is known, what is tentative, and what is ready.
- Help researchers prepare focused context for writing, review, synthesis, and implementation work.
- Support role-aware collaboration where agents understand the current research posture before acting.
- Keep Chitking-native product language stable even when implementation details evolve.

---

## Philosophy

Chitking is not shortcut automation.
It is a structured path for thinking.

The product should slow down the right things: source-of-truth decisions, maturity changes, readiness judgments, and durable research claims.
It may speed up reading, structuring, checking, context preparation, and mechanical organization, but only in service of clearer human research judgment.

Agents are assistants in the research path.
They may read, summarize, structure, compare, check, and prepare context.
They must not quietly decide that research has advanced, that evidence is mature, or that a thread is ready for downstream use.

---

## Non-goals

- Chitking is not an autonomous research pipeline.
- Chitking is not a replacement for human scholarly judgment.
- Chitking is not a hidden state machine that silently advances research progress.
- Chitking is not a general-purpose task runner.
- Chitking is not defined by any development harness, adapter, or external workflow system.
- Chitking should not use non-Chitking naming for generated product artifacts when a Chitking-native name is available.

---

## Boundaries

- `.chitking/` is Chitking product state.
  It stores the durable state Chitking owns for the research path.
- `.trellis/` is development workflow state only.
  Trellis may be a development harness or inspiration, but it is not Chitking runtime state or product identity.
- `research/` is user research content, co-owned by agent and human.
  Thread.md is collaboratively edited — agents may draft sections, record evidence, and fill content, but must not implicitly overwrite human edits.
  Hash-based change detection ensures agents always work from the latest file version.
- Humans own stage/readiness/maturity transitions and the overall research direction.
  Agents recommend, humans decide.
- Durable, user-editable files are source of truth.
  Generated context packets, temporary exports, and adapters are cache/context.
- Commands, file names, and generated labels should remain Chitking-native unless they refer to an external tool boundary.

---

## Product invariants

- Human users own stage/readiness/maturity transitions and the overall research direction.
- Thread.md content is co-owned by agent and human — both may write, but agents must not implicitly overwrite human edits.
- Chitking must keep durable research memory inspectable and editable by both humans and agents.
- Chitking must distinguish durable state from generated context.
- Chitking must make role context explicit before agents act on research material.
- Chitking must avoid silent state advancement (stage/readiness/maturity changes always require explicit human decision).
- Agents writing to thread.md must hash-check first to ensure they work from the latest version and never clobber a human's concurrent edit.
- Chitking must preserve clear boundaries among product state, development workflow state, and user research content.
- Chitking language should describe the product as its own research path.

---

## Decision principles

When product decisions are ambiguous, prefer the option that:

1. Makes research state more explicit rather than more implicit.
2. Keeps humans in control of stage/readiness/maturity transitions.
3. Writes durable conclusions to user-editable source files instead of generated packets.
4. Treats generated outputs as reproducible context, not authoritative truth.
5. Uses Chitking-native names and concepts for Chitking product behavior.
6. Preserves clean boundaries between `.chitking/`, `.trellis/`, and `research/`.
7. Helps a future researcher resume the thread with less hidden context.
8. When writing to thread.md, hash-check first and never implicitly overwrite a human's edit.

---

## What future agents should do when uncertain

- Read this doctrine before making product-facing changes.
- Ask whether a change affects human-owned stage/readiness/maturity transitions or research direction.
- Thread.md is co-owned — agents may write section content but must re-read (hash-check) before writing and never silently overwrite human edits.
- If a state transition is ambiguous, do not perform it silently; ask for explicit instruction or leave a visible pending state.
- If a file could be durable source of truth or generated context, choose durable only when it is user-editable and intended to be maintained.
- If naming is ambiguous, choose Chitking-native language.
- If Trellis is relevant, describe it only as a development harness or inspiration.
- If a proposed workflow starts to look autonomous, require explicit user direction before continuing.
