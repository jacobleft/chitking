# Database / Persistence Guidelines

> Chitking's current persistence model: filesystem, Markdown, YAML, and Git metadata.

---

## Overview

Chitking currently has no database, ORM, migrations, network storage, or transaction manager. Durable product state is user-editable files:

- `.chitking/config.yaml` for stages, stage advancement thresholds, maturity levels, role definitions, warnings, and incomplete markers.
- `.chitking/active.yaml` for the active-thread pointer.
- `.chitking/roles/*.md` for canonical role contracts.
- `research/project.md` for project-level research source of truth.
- `research/<thread>/thread.md` for thread-level research source of truth and frontmatter.

Generated context packets under `research/<thread>/context/*.yaml` are cache/context, not durable product truth.

---

## Read / Write Patterns

- Prefer small synchronous filesystem operations for CLI commands. Current command code uses `fs.existsSync`, `fs.readFileSync`, `fs.writeFileSync`, `fs.mkdirSync`, and `fs.readdirSync`.
- Always read and write text with `"utf-8"`.
- Use `yaml`'s `parse()` and `stringify()` for YAML files.
- Validate parsed YAML as a mapping before use. Existing helper: `readYamlRecord()`.
- Preserve existing user-edited generated files during `chitking init` by writing with `writeFileIfMissing()`.
- Keep generated context packets reproducible from source files; do not edit packet YAML by hand in command behavior.

---

## Migrations

There is no migration system. The current convention is template/default normalization:

- `defaultConfig()` reads `src/templates/chitking/config.yaml`.
- `normalizeConfig()` merges user config with defaults for missing stages, stage advancement thresholds, maturity levels, roles, and markers. It also accepts the legacy keys `maturity_ladder`, `readiness_thresholds`, and `min_maturity` as backward-compat aliases for `stages`, `stage_advancement`, and `min_stage` respectively.
- Re-running `chitking init` creates missing scaffold files without overwriting existing user-edited files.

If persistent schema changes are introduced later, update this guide with the actual migration mechanism before implementing the change.

---

## Naming Conventions

- Chitking product state lives under `.chitking/`.
- User research content lives under `research/`.
- Thread directories use normalized slugs from `slugifyTitle()` / `validateSlug()`.
- Thread source is always `research/<thread>/thread.md`.
- Generated role packets are `research/<thread>/context/<role>.yaml`.
- Config keys are snake_case YAML keys, matching current templates: `schema_version`, `stages`, `stage_advancement`, `maturity_levels`, `project_incomplete_markers`. Legacy aliases `maturity_ladder` and `readiness_thresholds` are still read for backward compat but not emitted by current templates.

---

## Examples

### YAML mapping validation

`src/commands/chitking.ts` rejects malformed YAML records:

```ts
function readYamlRecord(filePath: string): Record<string, unknown> {
  const parsed = parse(fs.readFileSync(filePath, "utf-8")) as unknown;
  if (!isRecord(parsed)) {
    throw new Error(`${filePath} must contain a YAML mapping`);
  }
  return parsed;
}
```

### Preserve user edits on init

`chitkingInit()` uses `writeFileIfMissing()` for generated files:

```ts
function writeFileIfMissing(filePath: string, content: string): void {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, "utf-8");
  }
}
```

### Generated packet points back to source files

`chitkingDispatch()` writes references instead of embedding full Markdown source. When called without `--role`, it loops over all configured roles (best-effort: per-role failures are collected without aborting the rest):

```ts
const packet = {
  role: options.role,
  thread: slug,
  project_file: toRepoPath(cwd, getProjectPath(cwd)),
  thread_file: toRepoPath(cwd, getThreadPath(cwd, slug)),
  source_thread_updated_at: thread.frontmatter.updated_at,
};
```

---

## Common Mistakes

- Do not add a database/ORM layer for Chitking state without an explicit product requirement.
- Do not treat `research/<thread>/context/*.yaml` as source of truth.
- Do not overwrite user-edited role contracts, agents, skills, or plugin files during repeated init.
- Do not silently mutate stage/readiness/maturity in generated adapters or context injection.
