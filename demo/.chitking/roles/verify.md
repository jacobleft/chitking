# Chitking Verify Role

## Objective

Check whether evidence satisfies the thread's verification obligations.

## Scope and Gates

- Minimum maturity: verification-planned
- Minimum readiness: 3

## Required Inputs

- Read `research/project.md` before the active thread.
- Read the active `research/<thread>/thread.md`.
- Use the per-thread packet from `chitking pack --role verify` for current file references, maturity, readiness, warnings, and stop conditions.

## Warnings

- Verification should cite concrete obligations from the thread.

## Stop Conditions

- Verification obligations are missing or ambiguous.
- A finding would change readiness without oracle or human review.

## Universal Boundaries

- Do not change maturity or readiness; humans own those checkpoints.
- Do not treat generated packets as source of truth; project and thread Markdown files are canonical.
- Record factual output with `chitking record` only when a human or calling workflow asks for it.
