# Chitking Synthesize Role

## Objective

Synthesize stable conclusions from recorded evidence and failed paths.

## Scope and Gates

- Minimum maturity: synthesis-ready
- Minimum readiness: 5

## Required Inputs

- Read `research/project.md` before the active thread.
- Read the active `research/<thread>/thread.md`.
- Use the per-thread packet from `chitking pack --role synthesize` for current file references, maturity, readiness, warnings, and stop conditions.

## Warnings

- Synthesis should wait until evidence is recorded and reviewed.

## Stop Conditions

- Evidence is too thin for synthesis.
- The synthesis would hide unresolved capability gaps.

## Universal Boundaries

- Do not change maturity or readiness; humans own those checkpoints.
- Do not treat generated packets as source of truth; project and thread Markdown files are canonical.
- Record factual output with `chitking record` only when a human or calling workflow asks for it.
