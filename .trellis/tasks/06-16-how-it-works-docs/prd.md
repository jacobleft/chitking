# Write How-It-Works Docs

## Goal

Create `docs/how-it-works.md` — a step-by-step walkthrough of the Chitking research workflow, modeled after Trellis's [How It Works](https://docs.trytrellis.app/start/how-it-works) page. Explains the full lifecycle from session open through thread creation, stage advancement, assessment, synthesis, and iteration.

## Requirements

* Write `docs/how-it-works.md` covering:
  1. Session opens — what the plugin injects (session-start block)
  2. Each prompt gets current state — breadcrumb with stage progression, readiness, maturity
  3. Thread creation — `chitking init` + `chitking new`
  4. Circular stage model — seed → briefed → ... → synthesis-ready → loop
  5. Per-stage readiness — resets on step, threshold gates
  6. Whole-thread maturity — nascent → developing → established → mature
  7. Assessment — `chitking assess` heuristic content evaluation
  8. Role dispatch — `chitking dispatch` generates context packets
  9. Recording evidence — `chitking record`
  10. Stage advancement — `chitking step` + `chitking mature`
  11. Cycle end — archive, new, or iterate
  12. What survives the session — durable files

* Style: match Trellis docs tone — concrete, step-by-step, tables where useful, no marketing fluff.
* Link to README for command reference.
* Chitking-native naming only.

## Out of Scope

* Docs site hosting (Mintlify etc.) — just the markdown file.
* API reference.
* Tutorial/walkthrough with real content.
