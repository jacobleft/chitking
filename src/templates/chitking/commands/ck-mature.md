# Chitking Mature

Update whole-thread maturity with explicit human consent.

## Usage

```text
/ck-mature --to <level> --reason <text>
```

## Steps

1. Confirm the user explicitly asked to change whole-thread maturity. Some host tools expose raw slash-command arguments as `$ARGUMENTS`.
2. Require a non-empty `--reason` from the user.
3. Run the matching Chitking command:

   ```bash
   chitking mature --to <level> --reason "<human reason>"
   ```

4. Report the maturity transition printed by Chitking.

## Boundaries

- Humans own maturity transitions. Never infer consent from agent analysis, tests passing, or `chitking assess` recommendations.
- Do not invent a reason. Use the user's stated reason or ask for one.
- Do not edit `research/<thread>/thread.md` frontmatter or history by hand to simulate this command.
- Maturity is distinct from stage and readiness; it describes holistic thread quality, not the current research step.
