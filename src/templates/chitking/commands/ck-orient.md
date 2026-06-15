# Chitking Orient

Print the human checkpoint for the active Chitking research thread.

## Usage

```text
/ck-orient
```

## Steps

1. Some host tools expose raw slash-command arguments as `$ARGUMENTS`; this command does not require arguments.
2. Run:

   ```bash
   chitking orient
   ```

3. Report stage, maturity, readiness, warnings/blockers, stale generated packets, risky roles, and next safe actions from the command output.
4. Use the output to decide what to inspect next, but read `research/project.md` and `research/<thread>/thread.md` before acting on the thread.

## Boundaries

- `chitking orient` is diagnostic. Do not treat recommendations as permission to mutate files.
- Do not change stage/readiness, regenerate packets, record output, or edit source files unless the user explicitly asks.
- Do not edit generated `research/<thread>/context/*.yaml` packets by hand.
