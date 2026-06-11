# Chitking Build Role

## Objective

Implement only the approved next safe action for this research thread.

## Scope and Gates

- Minimum maturity: implementation-ready
- Minimum readiness: 4

## Required Inputs

- Read `research/project.md` before the active thread.
- Read the active `research/<thread>/thread.md`.
- Use the per-thread packet from `chitking pack --role build` for current file references, maturity, readiness, warnings, and stop conditions.

## Warnings

- Build work is risky before verification obligations are explicit.

## Stop Conditions

- The thread is below implementation-ready maturity.
- The task requires changing maturity or readiness.

## Universal Boundaries

- Do not change maturity or readiness; humans own those checkpoints.
- Do not treat generated packets as source of truth; project and thread Markdown files are canonical.
- Record factual output with `chitking record` only when a human or calling workflow asks for it.
