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
import { parse } from "yaml";

import { chitkingInit } from "../../src/index.js";
import { getChitkingRuntimeTemplatePath } from "../../src/templates/extract.js";

const DEMO_ROOT = path.resolve("demo");

interface DemoConfig {
  roles: Record<string, unknown>;
  maturity_ladder: string[];
}

function demoPath(...segments: string[]): string {
  return path.join(DEMO_ROOT, ...segments);
}

function readDemoText(...segments: string[]): string {
  return readFileSync(demoPath(...segments), "utf-8");
}

function isDemoConfig(value: unknown): value is DemoConfig {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "roles" in value &&
    typeof value.roles === "object" &&
    value.roles !== null &&
    !Array.isArray(value.roles) &&
    "maturity_ladder" in value &&
    Array.isArray(value.maturity_ladder) &&
    value.maturity_ladder.every((entry) => typeof entry === "string")
  );
}

function readDemoConfig(): DemoConfig {
  const parsed = parse(readDemoText(".chitking", "config.yaml")) as unknown;
  if (!isDemoConfig(parsed)) {
    throw new Error("demo/.chitking/config.yaml must contain Chitking config");
  }
  return parsed;
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

function generatedScaffoldPaths(root: string): string[] {
  return [
    ".gitignore",
    path.join(".chitking", "config.yaml"),
    ...listRelativeFiles(path.join(root, ".chitking", "roles")).map(
      (filePath) => path.join(".chitking", "roles", filePath),
    ),
    ...listRelativeFiles(path.join(root, ".chitking", "skills")).map(
      (filePath) => path.join(".chitking", "skills", filePath),
    ),
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

    expect(existsSync(demoPath(".chitking"))).toBe(true);
    expect(existsSync(demoPath("research", "project.md"))).toBe(true);
    expect(existsSync(demoPath(".opencode"))).toBe(true);
    expect(existsSync(demoPath(".trellis"))).toBe(false);
    expect(readme).toContain("`.chitking/` is Chitking product state");
    expect(readme).toContain("`research/` is user-owned research content");
    expect(readme).toContain("`.opencode/` is generated tool adapter context");
    expect(contextReadme).toContain("not durable product truth");
    expect(adapterReadme).toContain("not the durable research truth");
    expect(readDemoText(".gitignore")).toContain("research/*/context/*.yaml");
  });

  it("keeps the scaffold config and generated adapters aligned", () => {
    expect(readDemoText(".chitking", "config.yaml")).toBe(
      readFileSync(getChitkingRuntimeTemplatePath("config.yaml"), "utf-8"),
    );

    const config = readDemoConfig();
    expect(config.maturity_ladder).toContain("implementation-ready");

    for (const role of Object.keys(config.roles)) {
      expect(existsSync(demoPath(".chitking", "roles", `${role}.md`))).toBe(
        true,
      );
      expect(
        existsSync(demoPath(".opencode", "agents", `chitking-${role}.md`)),
      ).toBe(true);
    }

    expect(
      existsSync(demoPath(".chitking", "skills", "chitking-workflow.md")),
    ).toBe(true);
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

  it("matches current generated scaffold files for role and adapter surfaces", () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "chitking-demo-"));
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    try {
      chitkingInit(tempDir);

      const generatedPaths = generatedScaffoldPaths(tempDir);
      expect(generatedScaffoldPaths(DEMO_ROOT)).toEqual(generatedPaths);

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

  it("keeps the active research thread human-owned and Chitking-native", () => {
    const active = parse(readDemoText(".chitking", "active.yaml")) as Record<
      string,
      unknown
    >;
    const project = readDemoText("research", "project.md");
    const thread = readDemoText("research", "contact-stability", "thread.md");
    const allDemoText = listFiles(DEMO_ROOT)
      .map((filePath) => readFileSync(filePath, "utf-8"))
      .join("\n");

    expect(active.active_thread).toBe("contact-stability");
    expect(thread).toContain("thread: contact-stability");
    expect(thread).toContain("readiness_source: human");
    expect(project).toContain("Readiness is human-owned");
    expect(thread).toContain("Humans must decide future maturity/readiness");
    expect(allDemoText).not.toMatch(/Research Trellis|\brt\b/i);
  });
});
