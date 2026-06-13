# Chitking Rename

Rename a Chitking research thread without changing its slug.

## Usage

```text
/ck-rename <thread-slug> <new title>
```

## Steps

1. Extract the thread slug and new human-readable title from the slash-command arguments or user request. Some host tools expose raw slash-command arguments as `$ARGUMENTS`. If either value is missing, ask before doing anything else.
2. Run:

   ```bash
   chitking rename <thread-slug> "<new title>"
   ```

3. Run `chitking show <thread-slug>` if the user wants confirmation of the new title and source file path.

## Boundaries

- Rename changes only the human-readable title, not the slug or directory name.
- Do not edit `research/<thread-slug>/thread.md` by hand to simulate this command.
- Do not change maturity or readiness; humans own those checkpoints.
