# Chitking Record

Append factual role output to the active Chitking research thread.

## Usage

```text
/ck-record --type <evidence|failure|decision|revision> --text <text> [--commit <ref>]
```

## Steps

1. Confirm the user or calling workflow explicitly wants to record factual output. Some host tools expose raw slash-command arguments as `$ARGUMENTS`.
2. Extract the record type, text, and optional commit ref. If any required value is missing, ask before doing anything else.
3. Run:

   ```bash
   chitking record --type <type> --text "<factual text>" [--commit <ref>]
   ```

4. Report that Chitking appended the record to the active thread.

## Boundaries

- Record only factual output, evidence, failures, decisions, or revisions that the user/calling workflow asked to preserve.
- Do not use `record` to silently promote stage/readiness or rewrite the theory.
- Do not edit `research/<thread>/thread.md` by hand to simulate this command.
