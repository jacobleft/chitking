# Fix pnpm link --global removed in v11

## Goal

The "Local testing against the demo" subsection in `README.md` (added in task `06-14-local-test-demo-docs`) recommends `pnpm link --global`, which was **removed in pnpm v11**. Replace it with the correct v11 command so the guide actually works on current pnpm.

## Root cause (researched)

Per [pnpm.io/cli/link](https://pnpm.io/cli/link) — "Breaking changes in v11":
- `pnpm link --global` has been removed.
- `pnpm link` now always requires an explicit path and cannot be called with no arguments.
- The replacement for registering a local package's binaries globally is `pnpm add -g .` (run from the package directory; requires a `bin` field in `package.json`, which Chitking has).

Observed errors when following the current guide:
1. With Homebrew/npm-global pnpm (no `PNPM_HOME` on PATH): `[ERROR] The configured global bin directory ".../Library/pnpm/bin" is not in PATH`.
2. With standalone pnpm v11: `[ERR_PNPM_LINK_BAD_PARAMS] You must provide a parameter. Usage: pnpm link <dir>`.

## Requirements

- In `README.md` "Local testing against the demo" subsection:
  - Replace the `pnpm link --global` command with `pnpm add -g .` as the primary "make runnable" mechanism.
  - Update the inline comment that explains the primary path.
  - Add a brief note that `pnpm add -g .` requires pnpm's global bin on PATH (i.e. pnpm installed via the standalone installer or `pnpm setup` run once); if not, use the `node bin/chitking.js` fallback.
  - Keep `node bin/chitking.js` as the no-install fallback (unchanged).
- Do NOT change anything else in the subsection (build, run sequence, observe, reset, pnpm test pointer all stay).
- No runtime code, dependency, or build-script changes.

## Acceptance Criteria

- [ ] `README.md` no longer mentions `pnpm link --global`.
- [ ] The primary "make runnable" command is `pnpm add -g .`.
- [ ] `node bin/chitking.js` fallback remains documented.
- [ ] A one-line note explains the pnpm global-bin PATH prerequisite.
- [ ] No other content in the subsection changed.
- [ ] Chitking-native naming preserved; no Trellis/rt language introduced.

## Out of Scope

- Changing the demo/README.md cross-link (already correct).
- Changing runtime code or the actual CLI.
- Documenting pnpm installation methods beyond a one-line prerequisite note.

## Technical Notes

- Source for the v11 breaking change: https://pnpm.io/cli/link (verified via Context7 `/websites/pnpm_io`).
- `package.json` has `"bin": { "chitking": "./bin/chitking.js" }`, so `pnpm add -g .` will register the `chitking` binary correctly.
- The fallback `node bin/chitking.js` is version- and install-method-independent, which is why it stays as the universal path.
