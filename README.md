# Chitking

Chitking (哲徑) is a standalone research-path CLI.

This bridge release preserves the Trellis-hosted RT scaffold names while extraction continues:

- primary binary: `chitking`
- compatibility binary: `rt`
- generated state directory: `.research-trellis`
- generated research directory: `research/`
- generated OpenCode names: `rt-*`, `rt-workflow`, and `inject-rt-context.js`

Currently migrated:

- `chitking init`
- `rt init`
- `chitking thread new <title> [--slug <slug>]`
- `rt thread new <title> [--slug <slug>]`
- `chitking focus [thread]`
- `rt focus [thread]`
- `chitking orient`
- `rt orient`
- `chitking step [--to <maturity>] [--readiness <0-5>] [--reason <text>]`
- `rt step [--to <maturity>] [--readiness <0-5>] [--reason <text>]`
- `chitking pack --role <role>`
- `rt pack --role <role>`
- `chitking record --type <type> --text <text> [--commit <ref>]`
- `rt record --type <type> --text <text> [--commit <ref>]`

Remaining RT runtime commands: none from the legacy Chitking bridge scope.

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```
