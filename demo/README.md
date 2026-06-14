# Chitking Demo Workspace

This folder is a committed example workspace for Chitking (哲徑). It is both a human-readable demo and a regression fixture for user-owned research content.

## What each area means

- This committed demo does not commit `.chitking/`. Run `chitking init` locally if you want runtime product state for experimentation.
- `research/` is user-owned research content: project context and thread source-of-truth Markdown.
- The committed demo does not commit generated `.opencode/` or `.codex/` adapter surfaces. `chitking init` regenerates them for local experimentation and tests.
- `research/<thread>/context/` is generated packet/cache space. Packet YAML can be recreated with `chitking pack --role <role>` and is ignored by this demo's `.gitignore`.

## Try it locally

To build and link the local CLI first, see [Local testing against the demo](../README.md#local-testing-against-the-demo) in the main README.

From this directory:

```bash
chitking init
chitking focus contact-stability
chitking orient
chitking pack --role plan
```

The important committed files to inspect are `research/project.md` and `research/contact-stability/thread.md`. The local `.chitking/`, `.opencode/`, and `.codex/` directories created by `chitking init` remain untracked in this demo. Humans own maturity, readiness, and source-of-truth decisions.
