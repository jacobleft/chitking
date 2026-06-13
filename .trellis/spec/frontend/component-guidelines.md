# Component Guidelines

> Current component reality: no browser UI components; CLI output is the user interface.

---

## Overview

Chitking currently has no React/Vue/Svelte components, JSX/TSX files, CSS modules, Tailwind, or browser accessibility layer. Do not add component abstractions unless a task explicitly introduces a frontend package.

For current work, treat CLI command output and generated Markdown/YAML templates as the user-facing presentation layer.

---

## Component Structure

No component structure exists yet. Current presentation structure is:

- Commander command declarations in `src/cli/chitking.ts`.
- Formatted text output in `src/commands/chitking.ts`.
- Generated Markdown role contracts from `defaultRoleContractContent()` and `dreamerRoleContractContent()`.
- Generated OpenCode adapters from `opencodeAdapterContent()` and generated OpenCode/Codex slash-command Markdown.

---

## Props Conventions

There are no component props. Existing input conventions are TypeScript option interfaces in `src/commands/chitking.ts`:

```ts
export interface StepOptions {
  to?: string;
  readiness?: number;
  reason?: string;
}

export interface PackOptions {
  role: string;
}
```

When adding command behavior, define a small exported interface for option objects if tests or consumers need to call the function directly.

---

## Styling Patterns

There is no CSS styling. The only current terminal styling is `chalk.red("Error:")` in the CLI error boundary.

Keep normal command output plain text. Use headings, blank lines, and bullet lists for multi-line output, as `chitkingOrient()` does.

Example from `src/commands/chitking.ts`:

```ts
const lines = [
  `Active thread: ${slug}`,
  `Maturity: ${thread.frontmatter.maturity}`,
  `Readiness: ${thread.frontmatter.readiness} (${thread.frontmatter.readiness_source})`,
  "",
  "Warnings / blockers:",
];
```

---

## Accessibility

Current accessibility is text-first CLI clarity:

- Do not rely on color alone for meaning.
- Keep help text understandable without terminal styling.
- Prefer explicit labels such as `Maturity:`, `Readiness:`, `Warnings / blockers:`, and `Recommended next safe actions:`.
- Keep generated Markdown role contracts readable as plain text.

---

## Common Mistakes

- Do not add UI component directories for a CLI-only change.
- Do not introduce styling dependencies for ordinary command output.
- Do not bury safety warnings in decorative formatting.
- Do not make generated adapters the only place where user-facing product meaning is explained; canonical state and role contracts remain source of truth.
