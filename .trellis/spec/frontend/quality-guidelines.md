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
- Keep generated slash-command shortcuts as thin wrappers around explicit Chitking CLI commands; they must not mutate maturity/readiness implicitly.
- Keep generated packets pointing to source files instead of embedding whole research Markdown.
- Add tests for command help, command output, generated files, and generated adapter behavior when changed.

---

## Testing Requirements

Current user-facing tests live in `test/commands/chitking.test.ts`:

- Help metadata test checks `Usage: chitking`, `Chitking (哲徑)`, and command names.
- Init tests check generated `.chitking/`, `research/`, `.opencode/`, and `.codex/` files and preservation on repeated init.
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

---

## Scenario: Generated Slash Commands

### 1. Scope / Trigger

- Trigger: adding or changing generated slash-command surfaces for OpenCode, Codex, or another agent tool.
- Scope: `src/templates/chitking/commands/**`, `src/templates/codex/**`, OpenCode command output under `.opencode/commands/**`, Codex command/skill output under `.codex/**`, and related init/demo tests.

### 2. Signatures

- OpenCode command files: `.opencode/commands/<ck-name>.md`; the filename is the command name.
- Codex command skills: `.codex/skills/<ck-name>/SKILL.md` with frontmatter `name: <ck-name>` and a concise `description`.
- Current command names mirror the CLI subcommand surface: `ck-init`, `ck-new`, `ck-list`, `ck-show`, `ck-focus`, `ck-rename`, `ck-archive`, `ck-restore`, `ck-delete`, `ck-orient`, `ck-step`, `ck-pack`, and `ck-record`.

### 3. Contracts

- Generated command bodies must use Chitking-native names: `chitking`, `.chitking`, `research/`, `ck-*`, and existing `chitking-*` role adapters.
- Generated command bodies may pass user-supplied slash-command arguments to the underlying CLI, but must keep source-of-truth and maturity/readiness boundaries visible.
- `chitking init` must preserve existing generated command files on repeat runs via the same non-overwrite behavior used for other generated adapter files.

### 4. Validation & Error Matrix

- Missing OpenCode command output -> init-generation or demo scaffold-generation test failure.
- Missing Codex skill/config output -> init-generation or demo scaffold-generation test failure.
- Generated command references Trellis, legacy `rt`, or non-Chitking product names -> product-boundary regression.
- Repeat init overwrites an edited generated command -> preservation test failure.
- Generated command mutates maturity/readiness without an explicit Chitking command -> source-of-truth boundary violation.

### 5. Good/Base/Bad Cases

- Good: add a shared Chitking command body, generate OpenCode and Codex-specific wrappers, keep committed `demo/` free of generated adapters, and assert generated output with a fresh `chitkingInit(tempDir)`.
- Base: add a platform-specific wrapper that delegates to a documented Chitking CLI command and preserves user edits.
- Bad: copy Trellis command names, add Trellis runtime dependencies, or make the slash command edit `.chitking/` state directly.

### 6. Tests Required

- Assert `chitking init` emits the expected OpenCode command files.
- Assert `chitking init` emits the expected Codex config and `SKILL.md` files.
- Assert generated files contain Chitking CLI commands and Chitking-native names.
- Assert generated command files are not overwritten on repeat init.
- Assert committed `demo/` does not include `.opencode/` or `.codex/`, then assert a fresh generated workspace contains the expected adapter paths.

### 7. Wrong vs Correct

#### Wrong

```md
Run a Trellis command and update workflow state directly.
```

#### Correct

```md
Run the matching explicit CLI command, such as `chitking new "<thread title>"`, `chitking focus <thread-slug>`, or `chitking pack --role <role>`, then report the Chitking command output.
```
