# Slash command source findings

## Chitking surfaces inspected

- `src/commands/chitking.ts`: `chitking init` writes `.chitking/`, `research/`, `.opencode/agents`, `.opencode/skills`, and `.opencode/plugins` with `writeFileIfMissing` so repeated init preserves user edits.
- `src/cli/chitking.ts`: complete Commander subcommand surface is `init`, `new`, `list`, `show`, `focus`, `rename`, `archive`, `restore`, `delete`, `orient`, `step`, `pack`, and `record`. The root `--status` flag is not a subcommand.
- `src/templates/chitking/skills/chitking-workflow.md`: canonical user-facing command boundaries for lifecycle, orientation, packet, and recording commands.
- `test/commands/chitking.test.ts` and `test/demo/demo.test.ts`: init-generation coverage plus demo boundary tests that generate adapters in temp workspaces.

## Trellis inspiration inspected

- `~/projects/Trellis/packages/cli/src/templates/common/commands/*.md`: short command Markdown files with concrete shell steps and expected routing.
- `~/projects/Trellis/packages/cli/src/configurators/opencode.ts`: OpenCode command files are generated under `.opencode/commands/...`.
- `~/projects/Trellis/packages/cli/src/templates/codex/skills/*/SKILL.md`: Codex uses skill directories with `SKILL.md` frontmatter for command-like entry points.

## External docs checked

- Context7 `/websites/opencode_ai`: OpenCode project commands can be Markdown files under `.opencode/commands/`; the filename becomes the command name.
- Context7 `/openai/codex`: Codex skills use `SKILL.md` with `name` and `description` frontmatter; the skill name becomes the slash command identifier.

## Implementation decision

- Add common Chitking command bodies under `src/templates/chitking/commands/`.
- Generate flat OpenCode commands for every CLI subcommand: `.opencode/commands/ck-init.md`, `ck-new.md`, `ck-list.md`, `ck-show.md`, `ck-focus.md`, `ck-rename.md`, `ck-archive.md`, `ck-restore.md`, `ck-delete.md`, `ck-orient.md`, `ck-step.md`, `ck-pack.md`, and `ck-record.md`.
- Generate matching Codex skill/slash commands under `.codex/skills/<ck-command>/SKILL.md`, plus `.codex/config.toml` so Codex has a project config layer for repo skills.
- Preserve existing role adapter naming (`chitking-*`) and use concise command names (`ck-*`) only for user-invoked slash commands.
- Keep every generated command as a safe wrapper around `chitking <command>`; wrappers must not manually edit `.chitking/`, `research/`, or generated context packets.
