# Research Project Context

## Research Domain

This demo studies contact stability in a small simulated manipulation task. The research question is whether a candidate stability score can predict when a grasp will remain usable after a small disturbance.

## Core Theoretical Commitments

- Treat contact stability as a measurable property, not a vibe or post-hoc label.
- Keep hypotheses separate from verified evidence.
- Make readiness changes only after a human checkpoint.

## Modeling Assumptions

- The demo assumes a low-dimensional simulator and repeatable disturbance settings.
- The active thread may propose metrics, but the project file remains the shared context across threads.
- Generated role packets summarize where to read; they do not replace this file.

## Verification Standards

- Evidence must name the dataset, simulator seed, or manual review artifact it came from.
- A claim is not synthesis-ready until failures and unresolved objections are recorded in the thread.
- Readiness is human-owned even when an oracle or verifier recommends a change.

## Code/Experiment Norms

- Prefer small, inspectable experiments over broad automation.
- Record factual outputs with `chitking record` when they affect the active research thread.
- Keep generated context under `research/<thread>/context/` reproducible from source files.

## Non-Goals

- This demo does not claim the stability metric is valid.
- This demo does not run autonomous research or silently advance maturity.
- This demo is not a source of truth for real research findings.
