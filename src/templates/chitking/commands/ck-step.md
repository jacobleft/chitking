# Chitking Step

Move Chitking maturity and/or readiness with explicit human consent.

## Usage

```text
/ck-step [--to <maturity>] [--readiness <0-5>] [--reason <text>]
```

## Steps

1. Confirm the user explicitly asked to change maturity and/or readiness. Some host tools expose raw slash-command arguments as `$ARGUMENTS`.
2. If moving to an explicit maturity with `--to`, require a non-empty `--reason` from the user.
3. Run the matching Chitking command, for example:

   ```bash
   chitking step
   chitking step --to <maturity> --readiness <0-5> --reason "<human reason>"
   ```

4. Report the maturity/readiness transition printed by Chitking.

## Boundaries

- Humans own maturity/readiness. Never infer consent from agent analysis, tests passing, or `chitking orient` recommendations.
- Do not invent a reason. Use the user's stated reason or ask for one.
- Do not edit `research/<thread>/thread.md` frontmatter or history by hand to simulate this command.
