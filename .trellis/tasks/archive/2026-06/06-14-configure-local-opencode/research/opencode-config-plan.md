# OpenCode Local Config Plan

## User-approved configuration

Write this project-local config only after approval:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "zai-coding-plan/glm-5.2",
  "small_model": "kimi-for-coding/k2p7",
  "enabled_providers": ["zai-coding-plan", "kimi-for-coding", "moonshotai", "moonshotai-cn"],
  "disabled_providers": ["openai", "github-copilot", "github-models", "openrouter"],
  "plugin": [],
  "agent": {
    "trellis-implement": {
      "model": "zai-coding-plan/glm-5.2"
    },
    "trellis-check": {
      "model": "zai-coding-plan/glm-5.2"
    },
    "trellis-research": {
      "model": "kimi-for-coding/k2p7"
    }
  }
}
```

## File placement

- Local config path: `.opencode/opencode.json`.
- Tracked ignore change: add `.opencode/opencode.json` to `.gitignore`.
- The local config file itself must not be committed.

## Schema facts

- OpenCode schema: `https://opencode.ai/config.json`.
- Valid top-level fields used here: `$schema`, `model`, `small_model`, `enabled_providers`, `disabled_providers`, `plugin`, `agent`.
- `plugin` is an array of strings or `[name, options]` tuples. Empty array is schema-valid and prevents this project config from adding omo-slim.
- `agent` is an object keyed by agent name. Each value may include a `model` field.

## Model facts from installed OpenCode

- `opencode models` listed `zai-coding-plan/glm-5.2`.
- `opencode models` listed `kimi-for-coding/k2p7`.
- Provider names in `enabled_providers` / `disabled_providers` are the prefix before `/` in model IDs.

## Verification expectations

- `git status --porcelain` should show only tracked task/spec/gitignore changes; `.opencode/opencode.json` should remain ignored after creation.
- `git check-ignore -v .opencode/opencode.json` should point to the new `.gitignore` rule.
- Do not write API keys or secrets.
- Tell the user to restart OpenCode after writing config; running sessions do not hot-reload config.
