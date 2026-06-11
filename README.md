# Chitking

Chitking (哲徑) is a standalone research-path CLI.

Chitking now generates Chitking-native scaffold names:

- primary binary: `chitking`
- generated state directory: `.chitking`
- generated research directory: `research/`
- generated OpenCode names: `chitking-*`, `chitking-workflow`, and `inject-chitking-context.js`

Currently migrated:

- `chitking init`
- `chitking thread new <title> [--slug <slug>]`
- `chitking focus [thread]`
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
