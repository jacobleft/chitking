# Configure Local OpenCode

## Goal

Create a repo-local OpenCode configuration that is ignored by git and can be reviewed before any config files are written. The config should prefer GLM and Kimi models, avoid GPT/OpenAI usage, and avoid the omo-slim plugin.

## What I Already Know

- User wants local OpenCode config, ignored from git.
- User wants plugin configuration with no omo-slim.
- User wants GLM and Kimi as the main models and no GPT usage.
- User explicitly asked to review before writing the config.
- Before implementation, no project-local `opencode.json*` existed at the repo root.
- Before implementation, `.opencode/opencode.json` did not exist in the repo workspace.
- Before implementation, `.gitignore` only ignored `.opencode/package.json`, plus demo-generated adapter surfaces.
- OpenCode project config can live at `./opencode.json`, `./opencode.jsonc`, or `.opencode/opencode.json`; project overrides global config.
- OpenCode validates config against `https://opencode.ai/config.json` and rejects unknown top-level fields.
- Relevant schema fields include `$schema`, `model`, `small_model`, `provider`, `enabled_providers`, `disabled_providers`, `plugin`, `agent`, and `permission`.
- Installed OpenCode reports direct GLM-related models under `zai-coding-plan/*`, including `zai-coding-plan/glm-5.1` and `zai-coding-plan/glm-5.2`.
- Installed OpenCode reports direct Kimi-related models under `kimi-for-coding/*`, `moonshotai/*`, and `moonshotai-cn/*`, including `kimi-for-coding/k2p7`, `kimi-for-coding/kimi-k2-thinking`, and `moonshotai/kimi-k2.7-code`.

## Assumptions (Temporary)

- “local config” means project-local to this repo, not global `~/.config/opencode/opencode.json`.
- The preferred path is `.opencode/opencode.json` because OpenCode auto-loads it and it keeps local AI-tool config grouped under `.opencode/`.
- `.opencode/opencode.json` should be added to `.gitignore` before creating it so the local file is not committed.
- “no GPT” means disable OpenAI provider use in this project, not delete global credentials.
- “no omo-slim” means the project config should not load `oh-my-opencode-slim` / `omo-slim` plugins and should override inherited plugin lists if needed.

## Open Questions

- None. User approved the exact local config plan.
- User clarified that the main target is configuring `trellis-implement`, `trellis-check`, and `trellis-research` to use either GLM or Kimi models.

## Requirements (Evolving)

- Draft the intended `.opencode/opencode.json` for user review before writing it.
- Add ignore coverage so the local config is not tracked by git.
- Configure OpenCode to prefer `zai-coding-plan/glm-5.2` as the primary model and a Kimi model for small/secondary tasks.
- Configure the project-local Trellis sub-agents (`trellis-implement`, `trellis-check`, `trellis-research`) with explicit GLM/Kimi model assignments.
- Configure OpenCode to avoid GPT/OpenAI usage.
- Configure plugin settings so omo-slim is not used.
- Preserve existing repo behavior and do not add runtime dependencies.

## Acceptance Criteria (Evolving)

- [x] User reviews and approves the exact config content before it is written.
- [x] `.opencode/opencode.json` is ignored by git.
- [x] The final config validates against the OpenCode schema.
- [x] The final config does not include omo-slim plugin entries.
- [x] The final config does not select GPT/OpenAI models.
- [x] `trellis-implement`, `trellis-check`, and `trellis-research` have explicit non-GPT model assignments.
- [x] `git status --porcelain` does not show the local OpenCode config after creation.

## Final Implementation State

- Added the single tracked ignore rule `.opencode/opencode.json` to `.gitignore`.
- Wrote the approved project-local config to `.opencode/opencode.json`; the file is ignored and should stay uncommitted.
- The config sets `model` to `zai-coding-plan/glm-5.2`, `small_model` to `kimi-for-coding/k2p7`, disables GPT/OpenAI-oriented providers, and leaves `plugin` empty so no omo-slim plugin is loaded from this project config.
- `trellis-implement` and `trellis-check` use `zai-coding-plan/glm-5.2`; `trellis-research` uses `kimi-for-coding/k2p7`.
- No secrets, API keys, Chitking runtime source changes, or package dependency changes were added.

## Definition of Done

- User has reviewed and approved the planned config.
- Local config is written only after approval.
- Ignore rule is committed through the Trellis flow if it changes tracked files.
- No secrets or API keys are committed.
- Basic verification confirms git ignores the local config.

## Out of Scope

- Editing global OpenCode config.
- Committing local model/API credentials.
- Adding or changing Chitking runtime behavior.
- Installing or uninstalling global plugins.

## Technical Notes

- OpenCode config schema reference fetched from `https://opencode.ai/config.json`.
- Candidate local config path: `.opencode/opencode.json`.
- Candidate tracked change: add `.opencode/opencode.json` to `.gitignore`.
- Research artifact: `research/opencode-config-plan.md`.
- Candidate config fields:
  - `$schema`: `https://opencode.ai/config.json`
  - `model`: `zai-coding-plan/glm-5.2`
  - `small_model`: Kimi provider/model ID such as `kimi-for-coding/k2p7`
  - `enabled_providers`: restrict to GLM/Kimi providers so GPT providers are unavailable
  - `disabled_providers`: include `openai`, `github-copilot`, `github-models`, and `openrouter` if strict no-GPT behavior is desired
  - `plugin`: array excluding omo-slim, possibly empty to override inherited plugin lists
  - `agent.trellis-implement.model`: candidate `zai-coding-plan/glm-5.2`
  - `agent.trellis-check.model`: candidate `zai-coding-plan/glm-5.2`
  - `agent.trellis-research.model`: candidate `kimi-for-coding/k2p7`
