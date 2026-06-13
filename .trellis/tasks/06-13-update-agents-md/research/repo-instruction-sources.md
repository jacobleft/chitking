# Repo instruction source findings

## Sources inspected

- `AGENTS.md`: Trellis-managed block plus Chitking product boundary note.
- `README.md`: current product description, migrated command list, and basic dev commands.
- `package.json`: package metadata, Node engine, bin entry, and authoritative scripts.
- `tsconfig.json`, `tsconfig.test.json`: ESM NodeNext strict TypeScript; test config includes `src`, `test`, and Vitest config.
- `vitest.config.ts`: Vitest includes `test/**/*.test.ts`, excludes `dist`, and uses 10s timeout.
- `eslint.config.js`: ESLint v9 flat config, strict/stylistic TypeScript, ignores JS/scripts/dist/node_modules.
- `src/index.ts`, `src/cli/chitking.ts`, `src/commands/chitking.ts`, `src/templates/extract.ts`, `bin/chitking.js`, `scripts/copy-templates.js`: package entrypoints and generated template flow.
- `test/commands/chitking.test.ts`, `test/demo/demo.test.ts`, `test/templates/extract.test.ts`: behavior and fixture contracts.
- `.gitignore`, `demo/.gitignore`, `demo/README.md`: committed/untracked state boundaries.
- `.trellis/spec/backend/index.md`, `.trellis/spec/frontend/index.md`: project-specific guardrails.

## High-signal facts for AGENTS.md

- This is a standalone Chitking CLI, not a web app and not a Trellis runtime product. Trellis is only the development harness.
- Runtime package is Node >=20, ESM TypeScript (`type: module`, `moduleResolution: NodeNext`) with public exports from `src/index.ts` and bin `chitking` resolving built `dist/cli/chitking.js`.
- Main command surface is `src/cli/chitking.ts`; core command behavior is in `src/commands/chitking.ts`.
- Generated scaffold templates live under `src/templates/` and are copied to `dist/templates` during `pnpm build` via `scripts/copy-templates.js`. If template files change, build output assumptions and tests may need attention.
- `demo/` is a committed regression fixture for user-owned source truth. It intentionally does not commit `demo/.chitking/`, `demo/.opencode/`, or `demo/.codex/`; ignore rules keep those generated surfaces local. `test/demo/demo.test.ts` should generate adapter surfaces in a temp workspace rather than requiring committed adapter files.
- Developer commands from `package.json`: `pnpm install`, `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm lint:fix`, `pnpm format`, `pnpm format:check`.
- Focused tests can be run with Vitest path/name filters, e.g. `pnpm vitest run test/commands/chitking.test.ts` or `pnpm vitest run test/commands/chitking.test.ts -t "archive requires"`.
- ESLint ignores `scripts/**` and `*.js`; do not assume JS helper scripts are linted by `pnpm lint`.
- For CLI surface changes, specs recommend `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, then `node bin/chitking.js --help` after build.
- Preserve Chitking-native names (`chitking`, `.chitking`, `research/`, `ck-*`, `chitking-*`, `chitking-workflow`, `inject-chitking-context.js`) and do not reintroduce legacy `rt` / Research Trellis naming.
