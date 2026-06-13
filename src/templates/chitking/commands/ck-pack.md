# Chitking Pack

Generate a role prompt packet for the active Chitking thread.

## Usage

```text
/ck-pack --role <role>
```

## Steps

1. Extract the role from the slash-command arguments or user request. Some host tools expose raw slash-command arguments as `$ARGUMENTS`. If the role is missing, ask for one of the configured Chitking roles.
2. Run:

   ```bash
   chitking pack --role <role>
   ```

3. Report the generated packet path printed by Chitking.
4. When using the packet, still read `research/project.md` before `research/<thread>/thread.md`.

## Boundaries

- Generated packets under `research/<thread>/context/*.yaml` are cache/context, not durable source of truth.
- Do not edit generated packet YAML by hand; rerun `chitking pack --role <role>` when stale.
- Do not use packet generation as approval to change maturity/readiness or source files.
