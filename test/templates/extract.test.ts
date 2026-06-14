import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  getCodexTemplatePath,
  getChitkingTemplatePath,
  getOpenCodeTemplatePath,
  getChitkingRuntimeTemplatePath,
  getTemplateRootPath,
} from "../../src/templates/extract.js";

const EXPECTED_CK_COMMANDS = [
  "ck-init",
  "ck-new",
  "ck-list",
  "ck-show",
  "ck-focus",
  "ck-rename",
  "ck-archive",
  "ck-restore",
  "ck-delete",
  "ck-orient",
  "ck-step",
  "ck-dispatch",
  "ck-record",
] as const;

describe("Chitking template extraction helpers", () => {
  it("resolves the source template root", () => {
    expect(path.basename(getTemplateRootPath())).toBe("templates");
    expect(existsSync(getChitkingTemplatePath("README.md.txt"))).toBe(true);
    expect(existsSync(getChitkingRuntimeTemplatePath("config.yaml"))).toBe(true);
    for (const command of EXPECTED_CK_COMMANDS) {
      expect(existsSync(getChitkingRuntimeTemplatePath("commands", `${command}.md`))).toBe(true);
    }
    expect(existsSync(getChitkingRuntimeTemplatePath("skills", "chitking-workflow.md"))).toBe(true);
    expect(existsSync(getOpenCodeTemplatePath("plugins", "inject-chitking-context.js"))).toBe(true);
    expect(existsSync(getCodexTemplatePath("config.toml"))).toBe(true);
    expect(readFileSync(getCodexTemplatePath("config.toml"), "utf-8")).not.toContain(
      "project_doc_fallback_filenames",
    );
  });

  it("can resolve copied dist templates after build", () => {
    const distTemplate = path.resolve("dist", "templates", "chitking", "README.md.txt");

    if (existsSync("dist")) {
      expect(existsSync(distTemplate)).toBe(true);
      expect(existsSync(path.resolve("dist", "templates", "chitking", "config.yaml"))).toBe(true);
      expect(
        existsSync(
          path.resolve("dist", "templates", "opencode", "plugins", "inject-chitking-context.js"),
        ),
      ).toBe(true);
      expect(existsSync(path.resolve("dist", "templates", "codex", "config.toml"))).toBe(true);
    }
  });
});
