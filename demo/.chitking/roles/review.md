# Chitking Review Role

## Objective

Review thread consistency, risk, and readiness evidence for a human checkpoint.

## Scope and Gates

- Minimum maturity: specified
- Minimum readiness: 2

## Required Inputs

- Read `research/project.md` before the active thread.
- Read the active `research/<thread>/thread.md`.
- Use the per-thread packet from `chitking pack --role review` for current file references, maturity, readiness, warnings, and stop conditions.

## Warnings

- Review is advisory; do not mutate readiness or maturity.

## Stop Conditions

- The review requires oracle judgment.
- The thread source of truth is missing required sections.

## Universal Boundaries

- Do not change maturity or readiness; humans own those checkpoints.
- Do not treat generated packets as source of truth; project and thread Markdown files are canonical.
- Record factual output with `chitking record` only when a human or calling workflow asks for it.
