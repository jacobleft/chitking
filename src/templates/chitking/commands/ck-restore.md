# Chitking Restore

Restore an archived Chitking research thread.

## Usage

```text
/ck-restore <thread-slug>
```

## Steps

1. Extract the thread slug from the slash-command arguments or user request. Some host tools expose raw slash-command arguments as `$ARGUMENTS`. If the slug is missing, ask which archived thread to restore.
2. Run:

   ```bash
   chitking restore <thread-slug>
   ```

3. If the user wants to resume the restored thread, run `chitking focus <thread-slug>` only after they ask for focus/resume.

## Boundaries

- Restore is an undo/recovery action. It does not focus the thread by itself.
- Do not edit `research/<thread-slug>/thread.md` by hand to simulate restore.
- Do not change stage or readiness; humans own those checkpoints.
