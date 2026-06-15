# Chitking Assess

Heuristic content evaluation that recommends but does not apply stage/readiness changes.

## Usage

```text
/ck-assess [thread]
```

## Steps

1. Optionally extract a thread slug from the slash-command arguments or user request. Some host tools expose raw slash-command arguments as `$ARGUMENTS`. If no thread is named, assess the active thread.
2. Run:

   ```bash
   chitking assess [thread]
   ```

3. Report the stage/readiness/maturity summary, pass/fail criteria, readiness-to-advance recommendation, maturity recommendation, and suggested next actions.
4. Do not apply any recommended changes unless the user explicitly asks.

## Boundaries

- `chitking assess` is read-only. It must not write any file.
- It recommends only; humans own stage, readiness, and maturity transitions.
- Do not edit `research/<thread>/thread.md` frontmatter by hand to apply the recommendation.
