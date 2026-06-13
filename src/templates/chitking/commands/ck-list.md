# Chitking List

List non-archived Chitking research threads.

## Usage

```text
/ck-list
```

## Steps

1. Some host tools expose raw slash-command arguments as `$ARGUMENTS`; this command does not require arguments.
2. Run:

   ```bash
   chitking list
   ```

3. Report the thread slugs exactly as Chitking prints them, including the active marker when present.
4. If the list is empty, suggest `chitking new "<thread title>"` or `/ck-new <thread title>` only if the user wants to create a thread.

## Boundaries

- Do not inspect `research/` manually as a replacement for `chitking list`.
- Do not focus, restore, archive, delete, or create a thread from list output unless the user explicitly asks.
- Do not change maturity or readiness; humans own those checkpoints.
