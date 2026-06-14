# Type Safety

> TypeScript conventions for Chitking's user-facing CLI surface.

---

## Overview

Chitking uses strict TypeScript for source and tests. There is no frontend-specific type layer, but CLI inputs, YAML parsing, thread frontmatter, role definitions, and command option objects are typed in `src/commands/chitking.ts` and `src/cli/chitking.ts`.

Current compiler baseline from `tsconfig.json`:

- `strict: true`
- `target: ES2022`
- `module: NodeNext`
- `moduleResolution: NodeNext`
- declaration and source maps emitted on build

---

## Type Organization

- Export interfaces/types only when tests or consumers need them: `ChitkingStatus`, `NewThreadOptions`, `StepOptions`, `DispatchOptions`, `FocusOptions`, `RecordOptions`, `RecordType`.
- Keep internal types unexported near their use: `RoleDefinition`, `ResearchConfig`, `ThreadFrontmatter`, `ParsedThread`, `GitSnapshot`.
- Use `as const` for fixed maps/lists that define derived unions.

Example from `src/commands/chitking.ts`:

```ts
const RECORD_SECTION_BY_TYPE = {
  evidence: "Evidence",
  failure: "Failed Paths",
  decision: "Decisions & Maturity History",
  revision: "Current Claim",
} as const;

export type RecordType = keyof typeof RECORD_SECTION_BY_TYPE;
```

---

## Validation

No runtime validation library is used. Current validation uses small type guards and explicit checks:

```ts
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
```

Use `unknown` for parsed YAML or dynamic plugin input, then narrow before reading fields.

Thread frontmatter parsing validates required fields and readiness bounds before returning typed data:

```ts
const readiness =
  typeof raw.readiness === "number" ? raw.readiness : Number(raw.readiness);
if (!Number.isInteger(readiness) || readiness < 0 || readiness > 5) {
  throw new Error("thread.md readiness must be an integer from 0 to 5.");
}
```

---

## Common Patterns

- Use optional fields for CLI options where Commander may omit a value.
- Return precise types from command functions (`string`, `string | null`, `void`) rather than untyped results.
- Use `Object.hasOwn()` before treating string input as a key of a fixed object.
- Use type predicates in array filters to narrow values loaded from YAML.

Example:

```ts
const markers = Array.isArray(raw.project_incomplete_markers)
  ? raw.project_incomplete_markers.filter(
      (item): item is string => typeof item === "string",
    )
  : (defaults?.project_incomplete_markers ?? []);
```

---

## Forbidden Patterns

- Do not use non-null assertions; lint forbids them.
- Do not trust parsed YAML, frontmatter, JSON-like plugin input, or Commander option objects without narrowing.
- Do not introduce `any` for dynamic data when `unknown` + guards fits the existing code style.
- Do not skip explicit return types on named functions.
- Do not expose internal helper types from `src/index.ts` unless they are part of the public package surface.
