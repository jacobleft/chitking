# Chitking Step

Move Chitking stage and/or readiness with explicit human consent.

## Usage

```text
/ck-step [--to <stage>] [--readiness <0-5>] [--reason <text>]
```

## Steps

1. Confirm the user explicitly asked to change stage and/or readiness. Some host tools expose raw slash-command arguments as `$ARGUMENTS`.
2. If moving to an explicit stage with `--to`, require a non-empty `--reason` from the user.
3. Run the matching Chitking command, for example:

   ```bash
   chitking step
   chitking step --to <stage> --readiness <0-5> --reason "<human reason>"
   ```

4. Report the stage/readiness transition printed by Chitking.

## Boundaries

- Humans own stage/readiness. Never infer consent from agent analysis, tests passing, or `chitking orient` recommendations.
- Do not invent a reason. Use the user's stated reason or ask for one.
- Do not edit `research/<thread>/thread.md` frontmatter or history by hand to simulate this command.
