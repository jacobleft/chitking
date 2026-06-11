# Chitking Demo Workspace

This folder is a committed example workspace for Chitking (哲徑). It is both a human-readable demo and a regression fixture for the CLI scaffold.

## What each area means

- `.chitking/` is Chitking product state: config, active thread pointer, canonical role contracts, and Chitking workflow guidance.
- `research/` is user-owned research content: project context and thread source-of-truth Markdown.
- `.opencode/` is generated tool adapter context: it helps an agent load Chitking role context, but it is not the durable research truth.
- `research/<thread>/context/` is generated packet/cache space. Packet YAML can be recreated with `chitking pack --role <role>` and is ignored by this demo's `.gitignore`.

## Try it locally

From this directory:

```bash
chitking orient
chitking pack --role plan
```

The important durable files to inspect are `research/project.md` and `research/contact-stability/thread.md`. Humans own maturity, readiness, and source-of-truth decisions.
