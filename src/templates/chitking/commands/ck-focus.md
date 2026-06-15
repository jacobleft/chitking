# Chitking Focus

Set the active Chitking research thread.

## Usage

```text
/ck-focus <thread-slug>
```

## Steps

1. Extract the thread slug from the slash-command arguments or user request. Some host tools expose raw slash-command arguments as `$ARGUMENTS`. If the slug is missing, run `chitking list` and ask which non-archived thread to focus.
2. Run:

   ```bash
   chitking focus <thread-slug>
   ```

3. Run `chitking show <thread-slug>` to confirm the active thread and source file path.
4. Read `research/project.md` before `research/<thread-slug>/thread.md` if the user asks you to continue working in the focused thread.

## Boundaries

- Do not focus archived threads. If the user wants an archived thread, ask whether to restore it with `chitking restore <thread-slug>` first.
- Do not change stage or readiness; humans own those checkpoints.
- Do not edit `.chitking/active.yaml` by hand to simulate this command.
