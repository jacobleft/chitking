# Chitking Iterate

Archive the active research thread and create a new successor thread with a predecessor link.

## Usage

```text
/ck-iterate <thread title> [--slug <slug>]
```

## Steps

1. Extract the new thread title and optional `--slug` from the slash-command arguments or user request. Some host tools expose raw slash-command arguments as `$ARGUMENTS`. If the title is missing, ask for it before doing anything else.
2. Confirm the user wants to archive the active thread and start a successor. Iteration is a lifecycle change.
3. Run:

   ```bash
   chitking iterate "<thread title>" [--slug <slug>]
   ```

4. Report the old slug, new slug, and that the new thread is now active.

## Boundaries

- Iteration archives the active thread. Do not run it unless the user clearly wants to end the current thread and start a successor.
- The new thread starts at seed/nascent/readiness 1. The researcher decides what content to carry forward.
- Do not edit `.chitking/active.yaml` or `research/<thread>/thread.md` by hand to simulate iteration.
