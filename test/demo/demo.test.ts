import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, vi } from "vitest";

import { chitkingInit } from "../../src/index.js";

const DEMO_ROOT = path.resolve("demo");
const REPO_GITIGNORE = path.resolve(".gitignore");
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
  "ck-assess",
  "ck-iterate",
  "ck-step",
  "ck-dispatch",
  "ck-record",
] as const;

function demoPath(...segments: string[]): string {
  return path.join(DEMO_ROOT, ...segments);
}

function readDemoText(...segments: string[]): string {
  return readFileSync(demoPath(...segments), "utf-8");
}

function listFiles(dirPath: string): string[] {
  return readdirSync(dirPath).flatMap((entry) => {
    if ([".chitking", ".opencode", ".codex"].includes(entry)) {
      return [];
    }
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

function trackedExistingIgnoredDemoFiles(): string[] {
  const output = execFileSync(
    "git",
    ["ls-files", "demo/.chitking", "demo/.opencode", "demo/.codex"],
    { encoding: "utf-8" },
  );
  return output
    .split(/\r?\n/)
    .filter((filePath) => filePath.length > 0 && existsSync(filePath))
    .sort();
}

function generatedAdapterPaths(root: string): string[] {
  return [
    ...listRelativeFiles(path.join(root, ".opencode", "agents")).map(
      (filePath) => path.join(".opencode", "agents", filePath),
    ),
    ...listRelativeFiles(path.join(root, ".opencode", "commands")).map(
      (filePath) => path.join(".opencode", "commands", filePath),
    ),
    ...listRelativeFiles(path.join(root, ".opencode", "skills")).map(
      (filePath) => path.join(".opencode", "skills", filePath),
    ),
    ...listRelativeFiles(path.join(root, ".opencode", "plugins")).map(
      (filePath) => path.join(".opencode", "plugins", filePath),
    ),
    path.join(".codex", "config.toml"),
    ...listRelativeFiles(path.join(root, ".codex", "skills")).map(
      (filePath) => path.join(".codex", "skills", filePath),
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

    expect(existsSync(demoPath("research", "project.md"))).toBe(true);
    expect(existsSync(demoPath(".trellis"))).toBe(false);
    expect(trackedExistingIgnoredDemoFiles()).toEqual([]);
    expect(readme).toContain("does not commit `.chitking/`");
    expect(readme).toContain("`research/` is user-owned research content");
    expect(readme).toContain("does not commit generated `.opencode/` or `.codex/`");
    expect(contextReadme).toContain("not durable product truth");
    expect(readDemoText(".gitignore")).toContain("research/*/context/*.yaml");
    expect(readDemoText(".gitignore")).toContain(".opencode/");
    expect(readDemoText(".gitignore")).toContain(".codex/");
    const repoGitignore = readFileSync(REPO_GITIGNORE, "utf-8");
    expect(repoGitignore).toContain("demo/.chitking/");
    expect(repoGitignore).toContain("demo/.opencode/");
    expect(repoGitignore).toContain("demo/.codex/");
  });

  it("generates current adapter surfaces in a temp workspace", () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "chitking-demo-adapters-"));
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    try {
      chitkingInit(tempDir);

      const roles = adapterRoleNames(tempDir);
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
          existsSync(
            path.join(tempDir, ".opencode", "agents", `chitking-${role}.md`),
          ),
        ).toBe(true);
      }

      expect(
        existsSync(
          path.join(
            tempDir,
            ".opencode",
            "skills",
            "chitking-workflow",
            "SKILL.md",
          ),
        ),
      ).toBe(true);
      expect(
        existsSync(
          path.join(tempDir, ".opencode", "plugins", "inject-chitking-context.js"),
        ),
      ).toBe(true);
      for (const command of EXPECTED_CK_COMMANDS) {
        expect(
          existsSync(path.join(tempDir, ".opencode", "commands", `${command}.md`)),
        ).toBe(true);
      }
      expect(existsSync(path.join(tempDir, ".codex", "config.toml"))).toBe(
        true,
      );
      for (const command of EXPECTED_CK_COMMANDS) {
        expect(
          existsSync(
            path.join(tempDir, ".codex", "skills", command, "SKILL.md"),
          ),
        ).toBe(true);
      }

      const generatedPaths = generatedAdapterPaths(tempDir);
      expect(generatedPaths).toContain(path.join(".codex", "config.toml"));
      for (const command of EXPECTED_CK_COMMANDS) {
        expect(generatedPaths).toContain(
          path.join(".opencode", "commands", `${command}.md`),
        );
        expect(generatedPaths).toContain(
          path.join(".codex", "skills", command, "SKILL.md"),
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

    expect(trackedExistingIgnoredDemoFiles()).toEqual([]);
    expect(thread).toContain("thread: contact-stability");
    expect(thread).toContain("readiness_source: human");
    expect(project).toContain("Readiness is human-owned");
    expect(thread).toContain("Humans must decide future stage/readiness");
    expect(allDemoText).not.toMatch(/Research Trellis|\brt\b/i);
  });
});
