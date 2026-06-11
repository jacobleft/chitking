import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  getChitkingTemplatePath,
  getOpenCodeTemplatePath,
  getRtTemplatePath,
  getTemplateRootPath,
} from "../../src/templates/extract.js";

describe("Chitking template extraction helpers", () => {
  it("resolves the source template root", () => {
    expect(path.basename(getTemplateRootPath())).toBe("templates");
    expect(existsSync(getChitkingTemplatePath("README.md.txt"))).toBe(true);
    expect(existsSync(getRtTemplatePath("config.yaml"))).toBe(true);
    expect(existsSync(getRtTemplatePath("skills", "rt-workflow.md"))).toBe(true);
    expect(existsSync(getOpenCodeTemplatePath("plugins", "inject-rt-context.js"))).toBe(true);
  });

  it("can resolve copied dist templates after build", () => {
    const distTemplate = path.resolve("dist", "templates", "chitking", "README.md.txt");

    if (existsSync("dist")) {
      expect(existsSync(distTemplate)).toBe(true);
      expect(existsSync(path.resolve("dist", "templates", "rt", "config.yaml"))).toBe(true);
      expect(
        existsSync(
          path.resolve("dist", "templates", "opencode", "plugins", "inject-rt-context.js"),
        ),
      ).toBe(true);
    }
  });
});
