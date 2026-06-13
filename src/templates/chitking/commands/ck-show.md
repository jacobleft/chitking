# Chitking Show

Show a Chitking research thread summary and source-of-truth paths.

## Usage

```text
/ck-show [thread-slug]
```

## Steps

1. Extract an optional thread slug from the slash-command arguments or user request. Some host tools expose raw slash-command arguments as `$ARGUMENTS`.
2. Run one of:

   ```bash
   chitking show
   chitking show <thread-slug>
   ```

3. Report the thread summary and source file paths printed by Chitking.
4. If the user asks to continue work on the shown thread, read `research/project.md` before `research/<thread-slug>/thread.md`.

## Boundaries

- `chitking show` is read-only. Do not modify thread state based only on the summary.
- Do not focus a thread just because it was shown; use `chitking focus <thread-slug>` only when requested.
- Do not change maturity or readiness; humans own those checkpoints.
