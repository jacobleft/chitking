# Chitking Archive

Archive a Chitking research thread.

## Usage

```text
/ck-archive <thread-slug> --yes
```

## Steps

1. Extract the thread slug from the slash-command arguments or user request. Some host tools expose raw slash-command arguments as `$ARGUMENTS`.
2. Require explicit user confirmation before archiving. If the user has not clearly confirmed archival, ask for confirmation and stop.
3. Run:

   ```bash
   chitking archive <thread-slug> --yes
   ```

4. Report that the thread is archived and no longer appears in normal `chitking list` or focus behavior.

## Boundaries

- Do not add `--yes` unless the user clearly asked to archive that exact thread.
- Do not edit `research/<thread-slug>/thread.md` or `.chitking/active.yaml` by hand to simulate archival.
- Archiving is a lifecycle state change, not a maturity/readiness change.
