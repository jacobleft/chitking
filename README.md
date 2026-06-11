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

Remaining RT runtime commands (`thread new`, `focus`, `orient`, `step`, `pack`, `record`) are planned for later slices.

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```
