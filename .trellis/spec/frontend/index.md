# Frontend / User-Facing Surface Guidelines

> Current conventions for Chitking's user-facing interface.

---

## Overview

Chitking does not currently have a browser frontend, React app, component tree, hooks, CSS, or client-side state library. The user-facing surface is the CLI built with Commander in `src/cli/chitking.ts`, plus generated tool adapters under `.opencode/` when users run `chitking init`.

Treat these frontend guidelines as "do not invent a web UI" guidance until a real frontend package exists. If a task adds a browser UI, update this spec with the actual code patterns introduced by that task.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Current user-facing CLI and generated adapter layout | Filled |
| [Component Guidelines](./component-guidelines.md) | No UI components yet; CLI output conventions instead | Filled |
| [Hook Guidelines](./hook-guidelines.md) | No React/custom hooks yet; command helper conventions instead | Filled |
| [State Management](./state-management.md) | Filesystem-backed CLI state, not frontend state | Filled |
| [Quality Guidelines](./quality-guidelines.md) | CLI UX, tests, accessibility-by-text checks | Filled |
| [Type Safety](./type-safety.md) | TypeScript conventions for user-facing CLI inputs/outputs | Filled |

---

## Pre-Development Checklist

- [ ] Confirm whether the task truly adds a web/frontend package. If not, work in the CLI surface.
- [ ] Read [Chitking Product Doctrine](../guides/chitking-product-doctrine.md) before changing user-facing wording.
- [ ] Preserve Chitking-native names in help text, generated adapters, and scaffold files.
- [ ] Keep generated role packets and adapters subordinate to source-of-truth files.
- [ ] Add/update CLI behavior tests for changed output or options.

---

## Quality Check

- [ ] `pnpm build`
- [ ] `pnpm test`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `node bin/chitking.js --help` after build when CLI text/options change

---

**Language**: All documentation should be written in **English**.
