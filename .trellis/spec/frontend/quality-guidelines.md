# Quality Guidelines

> Quality standards for Chitking's current user-facing CLI surface.

---

## Overview

Because there is no browser frontend, frontend quality currently means CLI UX quality, generated adapter safety, text accessibility, and test coverage for user-facing behavior.

Use the same project checks as backend/core CLI work:

- `pnpm build`
- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`
- `node bin/chitking.js --help` after build when help text or commands change

---

## Forbidden Patterns

- Do not add web framework dependencies for CLI-only changes.
- Do not add `src/components`, `src/hooks`, CSS, or client state scaffolding until the product has a real frontend requirement.
- Do not make color the only signal in terminal output.
- Do not change maturity/readiness through generated adapters or plugin context injection.
- Do not use product wording that frames Chitking as dependent on the development harness.

---

## Required Patterns

- Keep CLI help text clear and Chitking-native.
- Preserve the Commander help surface when adding commands.
- Keep generated role adapters bounded by canonical role contracts and read-only context where appropriate.
- Keep generated packets pointing to source files instead of embedding whole research Markdown.
- Add tests for command help, command output, generated files, and generated adapter behavior when changed.

---

## Testing Requirements

Current user-facing tests live in `test/commands/chitking.test.ts`:

- Help metadata test checks `Usage: chitking`, `Chitking (哲徑)`, and command names.
- Init tests check generated `.chitking/`, `research/`, `.opencode/` files and preservation on repeated init.
- Plugin tests import the generated OpenCode plugin template and verify context injection stays bounded.
- Pack/orient/record tests verify generated output and warnings.

Example help test:

```ts
const program = createChitkingProgram();
const help = program.helpInformation();

expect(help).toContain("Usage: chitking");
expect(help).toContain("Chitking (哲徑)");
expect(help).toContain("orient");
expect(help).toContain("record");
```

---

## Accessibility / UX Checklist

- [ ] Help text explains each command without requiring external docs.
- [ ] Error messages tell the user what is wrong and, where possible, what command to run next.
- [ ] Multi-line output has stable headings and bullets.
- [ ] Generated Markdown is readable in plain text.
- [ ] Warnings distinguish blockers from allowed-but-risky actions.
- [ ] Human-owned maturity/readiness boundaries are visible in CLI text and generated adapters.

---

## Code Review Checklist

- [ ] User-facing wording follows the product doctrine.
- [ ] Command additions include help text and tests.
- [ ] Output remains stable enough for users and tests.
- [ ] Generated adapters remain convenience layers, not source of truth.
- [ ] CLI changes pass build, test, lint, typecheck, and help smoke test when relevant.
