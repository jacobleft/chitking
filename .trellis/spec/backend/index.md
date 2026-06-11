# Backend / Core CLI Development Guidelines

> Project-specific conventions for Chitking's TypeScript command core.

---

## Overview

Chitking is currently a standalone Node.js CLI, not a web service. In this project, "backend" means the command implementation layer that reads and writes Chitking state, templates, YAML, Markdown, and Git metadata.

There are no HTTP routes, background workers, ORM models, or migrations in the current codebase. Do not invent those layers unless a future task explicitly adds them and updates these specs.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Module organization and file layout | Filled |
| [Database Guidelines](./database-guidelines.md) | Filesystem/YAML persistence patterns; no database layer | Filled |
| [Error Handling](./error-handling.md) | CLI error propagation and process exit behavior | Filled |
| [Quality Guidelines](./quality-guidelines.md) | TypeScript, lint, testing, and review standards | Filled |
| [Logging Guidelines](./logging-guidelines.md) | Console output conventions for CLI commands | Filled |

---

## Pre-Development Checklist

- [ ] Read [Chitking Product Doctrine](../guides/chitking-product-doctrine.md) for product boundaries.
- [ ] Confirm the work belongs in the CLI command core rather than generated Chitking state or research content.
- [ ] Search existing helpers before adding new filesystem, YAML, slug, or template utilities.
- [ ] Keep Chitking runtime independent from the development harness.
- [ ] Update or add Vitest coverage when command behavior, templates, or generated files change.
- [ ] If changing generated scaffold files or demo-facing behavior, update the committed `demo/` fixture and `test/demo/` regression coverage together.

---

## Quality Check

- [ ] `pnpm build`
- [ ] `pnpm test`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `node bin/chitking.js --help` after build when CLI surface changes
- [ ] `git diff --check`
- [ ] `python3 ./.trellis/scripts/task.py validate 00-bootstrap-guidelines` for this bootstrap task while it remains active

---

**Language**: All documentation should be written in **English**.
