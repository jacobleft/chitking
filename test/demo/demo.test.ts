import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, vi } from "vitest";

import { chitkingInit } from "../../src/index.js";

const DEMO_ROOT = path.resolve("demo");
const REPO_GITIGNORE = path.resolve(".gitignore");

function demoPath(...segments: string[]): string {
  return path.join(DEMO_ROOT, ...segments);
}

function readDemoText(...segments: string[]): string {
  return readFileSync(demoPath(...segments), "utf-8");
}

function listFiles(dirPath: string): string[] {
  return readdirSync(dirPath).flatMap((entry) => {
    const filePath = path.join(dirPath, entry);
    if (statSync(filePath).isDirectory()) {
      return listFiles(filePath);
    }
    return [filePath];
  });
}

function listRelativeFiles(dirPath: string): string[] {
  return listFiles(dirPath)
    .map((filePath) => path.relative(dirPath, filePath))
    .sort();
}

function generatedAdapterPaths(root: string): string[] {
  return [
    ...listRelativeFiles(path.join(root, ".opencode", "agents")).map(
      (filePath) => path.join(".opencode", "agents", filePath),
    ),
    ...listRelativeFiles(path.join(root, ".opencode", "skills")).map(
      (filePath) => path.join(".opencode", "skills", filePath),
    ),
    ...listRelativeFiles(path.join(root, ".opencode", "plugins")).map(
      (filePath) => path.join(".opencode", "plugins", filePath),
    ),
  ].sort();
}

function adapterRoleNames(root: string): string[] {
  return listRelativeFiles(path.join(root, ".opencode", "agents"))
    .map((filePath) => {
      const match = /^chitking-(.+)\.md$/.exec(filePath);
      if (!match || match[1] === undefined) {
        throw new Error(`Unexpected adapter file: ${filePath}`);
      }
      return match[1];
    })
    .sort();
}

describe("demo Chitking workspace", () => {
  it("documents product, research, and generated-context boundaries", () => {
    const readme = readDemoText("README.md");
    const contextReadme = readDemoText(
      "research",
      "contact-stability",
      "context",
      "README.md",
    );
    const adapterReadme = readDemoText(".opencode", "README.md");

    expect(existsSync(demoPath(".chitking"))).toBe(false);
    expect(existsSync(demoPath("research", "project.md"))).toBe(true);
    expect(existsSync(demoPath(".opencode"))).toBe(true);
    expect(existsSync(demoPath(".trellis"))).toBe(false);
    expect(readme).toContain("does not commit `.chitking/`");
    expect(readme).toContain("`research/` is user-owned research content");
    expect(readme).toContain("`.opencode/` is generated tool adapter context");
    expect(contextReadme).toContain("not durable product truth");
    expect(adapterReadme).toContain("not the durable research truth");
    expect(readDemoText(".gitignore")).toContain("research/*/context/*.yaml");
    expect(readFileSync(REPO_GITIGNORE, "utf-8")).toContain("demo/.chitking/");
  });

  it("keeps the committed generated adapter surface aligned", () => {
    const roles = adapterRoleNames(DEMO_ROOT);
    expect(roles).toEqual([
      "build",
      "dreamer",
      "oracle",
      "plan",
      "review",
      "synthesize",
      "verify",
    ]);

    for (const role of roles) {
      expect(
        existsSync(demoPath(".opencode", "agents", `chitking-${role}.md`)),
      ).toBe(true);
    }

    expect(
      existsSync(
        demoPath(".opencode", "skills", "chitking-workflow", "SKILL.md"),
      ),
    ).toBe(true);
    expect(
      existsSync(
        demoPath(".opencode", "plugins", "inject-chitking-context.js"),
      ),
    ).toBe(true);
  });

  it("matches current generated files for committed adapter surfaces", () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "chitking-demo-"));
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    try {
      chitkingInit(tempDir);

      const generatedPaths = generatedAdapterPaths(tempDir);
      expect(generatedAdapterPaths(DEMO_ROOT)).toEqual(generatedPaths);

      for (const relativePath of generatedPaths) {
        expect(readFileSync(demoPath(relativePath), "utf-8")).toBe(
          readFileSync(path.join(tempDir, relativePath), "utf-8"),
        );
      }
    } finally {
      logSpy.mockRestore();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("keeps the demo research thread human-owned and Chitking-native", () => {
    const project = readDemoText("research", "project.md");
    const thread = readDemoText("research", "contact-stability", "thread.md");
    const allDemoText = listFiles(DEMO_ROOT)
      .map((filePath) => readFileSync(filePath, "utf-8"))
      .join("\n");

    expect(existsSync(demoPath(".chitking"))).toBe(false);
    expect(thread).toContain("thread: contact-stability");
    expect(thread).toContain("readiness_source: human");
    expect(project).toContain("Readiness is human-owned");
    expect(thread).toContain("Humans must decide future maturity/readiness");
    expect(allDemoText).not.toMatch(/Research Trellis|\brt\b/i);
  });
});
