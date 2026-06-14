# Chitking Dispatch

Generate role prompt packets for the active Chitking thread.

## Usage

```text
/ck-dispatch [--role <role>]
```

## Steps

1. Extract the optional role from the slash-command arguments or user request. Some host tools expose raw slash-command arguments as `$ARGUMENTS`.
2. Run:

   ```bash
   chitking dispatch [--role <role>]
   ```

   Omit `--role` to dispatch all configured roles, or pass `--role <role>` for a single role.

3. Report the generated packet path(s) printed by Chitking.
4. When using the packet, still read `research/project.md` before `research/<thread>/thread.md`.

## Boundaries

- Generated packets under `research/<thread>/context/*.yaml` are cache/context, not durable source of truth.
- Do not edit generated packet YAML by hand; rerun `chitking dispatch` when stale.
- Do not use packet generation as approval to change maturity/readiness or source files.
