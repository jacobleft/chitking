# Chitking Delete

Delete a Chitking research thread directory.

## Usage

```text
/ck-delete <thread-slug> --yes
```

## Steps

1. Extract the thread slug from the slash-command arguments or user request. Some host tools expose raw slash-command arguments as `$ARGUMENTS`.
2. Require explicit user confirmation before deletion. If the user has not clearly confirmed deleting that exact thread, ask for confirmation and stop.
3. Run:

   ```bash
   chitking delete <thread-slug> --yes
   ```

4. Report that the durable `research/<thread-slug>/` directory was deleted.

## Boundaries

- Deletion removes durable research source files. Do not add `--yes` unless the user clearly asked to delete that exact thread.
- Prefer `chitking archive <thread-slug> --yes` when the user only wants to hide or pause a thread.
- Do not remove files manually to simulate this command.
