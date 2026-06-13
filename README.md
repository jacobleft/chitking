# Chitking

Chitking (哲徑) is a standalone research-path CLI.

Chitking now generates Chitking-native scaffold names:

- primary binary: `chitking`
- generated state directory: `.chitking`
- generated research directory: `research/`
- generated OpenCode names: `chitking-*`, `ck-*`, `chitking-workflow`, and `inject-chitking-context.js`
- generated Codex slash-command skills: `.codex/skills/ck-*/SKILL.md`

Currently migrated:

- `chitking init`
- `chitking new <title> [--slug <slug>]`
- `chitking list`
- `chitking show [thread]`
- `chitking focus <thread>`
- `chitking rename <thread> <title>`
- `chitking archive <thread> --yes`
- `chitking restore <thread>`
- `chitking delete <thread> --yes`
- `chitking orient`
- `chitking step [--to <maturity>] [--readiness <0-5>] [--reason <text>]`
- `chitking pack --role <role>`
- `chitking record --type <type> --text <text> [--commit <ref>]`

Remaining Chitking runtime commands: none from the legacy bridge scope.

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```
