# Chitking Init

Initialize the Chitking scaffold and generated adapter surfaces in the current repository.

## Usage

```text
/ck-init
```

## Steps

1. Confirm the user wants to initialize Chitking in the current repository. Some host tools expose raw slash-command arguments as `$ARGUMENTS`; this command does not require arguments.
2. Run:

   ```bash
   chitking init
   ```

3. Report that Chitking created or preserved `.chitking/`, `research/`, `.opencode/`, and `.codex/` scaffold files.
4. If the user wants to begin a thread, suggest `chitking new "<thread title>"` or `/ck-new <thread title>`.

## Boundaries

- Do not manually create or edit `.chitking/`, `research/`, `.opencode/`, or `.codex/` files to simulate initialization.
- `chitking init` preserves existing generated files; do not overwrite user-edited generated adapters by hand.
- Do not create a research thread unless the user also clearly requests one.
