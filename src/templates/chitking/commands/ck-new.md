# Chitking New

Create and focus a new Chitking research thread.

## Usage

```text
/ck-new <thread title> [--slug <slug>]
```

## Steps

1. Extract the thread title and optional `--slug` from the slash-command arguments or user request. Some host tools expose raw slash-command arguments as `$ARGUMENTS`. If the title is missing, ask for it before doing anything else.
2. If the user supplied `--slug`, use it exactly as the explicit slug; otherwise let Chitking derive the slug.
3. Run:

   ```bash
   chitking new "<thread title>" [--slug <slug>]
   ```

4. Report the created slug and remind the user that the new thread is now active.
5. Read `research/project.md` before summarizing or acting on the new thread.

## Boundaries

- Only create a durable thread when the user clearly wants one.
- Do not change stage or readiness; humans own those checkpoints.
- Do not edit `.chitking/config.yaml`, `.chitking/active.yaml`, or `research/<thread>/thread.md` by hand to simulate this command.
- If `chitking new` fails because the repository is not initialized, tell the user to run `chitking init` first.
