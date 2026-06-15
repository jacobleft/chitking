# Cleanup: Remove Dup ck-step + Assess Mature Recommendation + Split Commands Module

## Goal

Three changes:
1. Remove duplicate `ck-step` entry from `CK_COMMANDS` array.
2. Change `chitkingAssess` maturity recommendation from "edit thread.md frontmatter" to `chitking mature --to <level> --reason "..."`.
3. Split `src/commands/chitking.ts` (1967 lines) into focused modules without changing behavior.

## Requirements

### 1. Remove duplicate ck-step

`CK_COMMANDS` array has `ck-step` at both line 34 and line 40. Remove the duplicate. Keep one entry.

### 2. Assess maturity recommendation

Line 1653: `→ To apply: edit thread.md frontmatter \`maturity: ${recommend}\``

Change to: `→ To apply: chitking mature --to ${recommend} --reason "..."`

### 3. Split chitking.ts into modules

Split the 1967-line `src/commands/chitking.ts` into focused modules under `src/commands/`:

| Module | Content | Est. lines |
|---|---|---|
| `types.ts` | All types, interfaces, constants (CK_COMMANDS, CK_COMMAND_DESCRIPTIONS, REQUIRED_THREAD_SECTIONS, RECORD_SECTION_BY_TYPE, ResearchConfig, RoleDefinition, AssessCriterion, ParsedThread, ActiveState, GitSnapshot, Options interfaces, RecordType) | ~200 |
| `utils.ts` | Shared utilities: nowIso, isRecord, ensureDir, writeFileIfMissing, readYamlRecord, writeYamlFile, toRepoPath, all get*Path/get*Dir functions, statusLinePaths, isGeneratedContextPath, isOrientHousekeepingStatus | ~300 |
| `config.ts` | Config: normalizeConfig, parseRoles, parseAssessCriterion, parseAssessCriteria, defaultConfig, loadConfig + thread I/O: parseThreadContent, formatThreadContent, readThread, writeThread, readStageAndMaturity, isThreadArchived, stringField, slugifyTitle, validateSlug, validateReadiness, ensureThreadSections, appendToSection, extractSectionBody, listThreadSummaries, formatThreadSummary, requireThreadNotArchived, parseActiveState, writeActiveState, readActiveThreadOrNull, clearActiveThreadIfMatches, readUsableActiveThreadOrNull, resolveActiveThread, resolveActiveThreadReadOnly | ~500 |
| `templates.ts` | Template content + scaffold: getChitkingRuntimeTemplateFilePath, defaultConfigTemplateContent, commandTemplateContent, openCodeCommandContent, codexCommandSkillContent, codexConfigTemplateContent, defaultProjectContent, defaultThreadBody, roleTitle, defaultRoleContractContent, opencodePermissionsForRole, opencodeAdapterContent, chitkingWorkflowSkillContent, opencodeChitkingWorkflowSkillContent, ensureOpenCodeChitkingContextPlugin, ensureSlashCommands, ensureChitkingWorkflowSkill, ensureRoleHarness | ~400 |
| `commands.ts` | All exported chitking* command functions + dispatch helpers: chitkingInit, chitkingNew, chitkingList, chitkingShow, chitkingFocus, chitkingRename, chitkingArchive, chitkingRestore, chitkingDelete, chitkingOrient, chitkingAssess, chitkingIterate, chitkingStep, chitkingMature, chitkingDispatch, chitkingRecord, parseRecordType, buildRolePacket, autoDispatch, evaluateCriterion, resolveCommit, readGitSnapshot, roleRiskWarnings, findStalePackets, projectLooksIncomplete, getChitkingStatus, formatChitkingStatus | ~600 |

`src/commands/chitking.ts` becomes a barrel file that re-exports from the modules (for backward compat with any direct imports).

**Constraint: no behavior change.** Pure move-and-export refactor. All tests must pass unchanged.

### 4. Supporting changes

- Update `src/index.ts` if import paths change (shouldn't need to if chitking.ts re-exports).
- Version bump (refactor + fix = `feat:` per convention since it includes the assess recommendation fix).

## Acceptance Criteria

* [ ] `CK_COMMANDS` has no duplicate entries.
* [ ] `chitkingAssess` recommends `chitking mature --to <level> --reason "..."`.
* [ ] `src/commands/chitking.ts` split into 5 modules + barrel re-export.
* [ ] No behavior change — all 73 tests pass unchanged.
* [ ] `pnpm build && pnpm test && pnpm lint && pnpm typecheck` pass.
* [ ] `git diff --check` clean.
* [ ] Version bumped.

## Out of Scope

* Behavior changes to any command.
* New features.
* API changes (all exports stay the same).

## Technical Notes

* The module split must preserve all current exports from `src/commands/chitking.ts` — `src/index.ts` imports from it.
* Internal helpers that are NOT exported can move freely between modules as long as they're imported correctly.
* The barrel `chitking.ts` should re-export the public API so existing imports (`from "./chitking.js"` etc.) still work.
* ESM/NodeNext resolution: all imports must use `.js` extensions in import paths.
