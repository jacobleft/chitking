import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  chitkingInit,
  createChitkingProgram,
  formatChitkingStatus,
  getChitkingStatus,
} from "../../src/index.js";

const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
  const tempDir = mkdtempSync(path.join(tmpdir(), prefix));
  tempDirs.push(tempDir);
  return tempDir;
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const tempDir of tempDirs.splice(0)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

describe("chitking command skeleton", () => {
  it("returns status for migrated init behavior", () => {
    const status = getChitkingStatus();

    expect(status.productName).toBe("Chitking");
    expect(status.chineseName).toBe("哲徑");
    expect(status.behaviorMigrated).toBe(true);
    expect(formatChitkingStatus(status)).toContain("init scaffold behavior is available");
  });

  it("creates a Commander program with Chitking help metadata", () => {
    const program = createChitkingProgram();
    const help = program.helpInformation();

    expect(help).toContain("Usage: chitking");
    expect(help).toContain("Chitking (哲徑)");
    expect(help).toContain("--status");
    expect(help).toContain("init");
  });

  it("can present the legacy rt alias identity", () => {
    const program = createChitkingProgram({ name: "rt" });
    const help = program.helpInformation();

    expect(help).toContain("Usage: rt");
    expect(help).toContain("-v, --version");
    expect(help).toContain("init");
  });

  it("initializes the RT-compatible scaffold", () => {
    const cwd = makeTempDir("chitking-init-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    chitkingInit(cwd);

    expect(existsSync(path.join(cwd, ".research-trellis", "config.yaml"))).toBe(true);
    expect(existsSync(path.join(cwd, ".research-trellis", "active.yaml"))).toBe(true);
    expect(existsSync(path.join(cwd, "research", "project.md"))).toBe(true);
    expect(existsSync(path.join(cwd, ".research-trellis", "roles", "plan.md"))).toBe(true);
    expect(existsSync(path.join(cwd, ".opencode", "agents", "rt-plan.md"))).toBe(true);
    expect(
      existsSync(path.join(cwd, ".opencode", "skills", "rt-workflow", "SKILL.md")),
    ).toBe(true);
    expect(
      existsSync(path.join(cwd, ".opencode", "plugins", "inject-rt-context.js")),
    ).toBe(true);
    expect(readFileSync(path.join(cwd, ".gitignore"), "utf-8")).toContain(
      "research/*/context/*.yaml",
    );
  });

  it("preserves user-edited generated files on repeated init", () => {
    const cwd = makeTempDir("chitking-init-preserve-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    chitkingInit(cwd);
    const rolePath = path.join(cwd, ".research-trellis", "roles", "plan.md");
    const agentPath = path.join(cwd, ".opencode", "agents", "rt-plan.md");
    const skillPath = path.join(cwd, ".opencode", "skills", "rt-workflow", "SKILL.md");
    const pluginPath = path.join(cwd, ".opencode", "plugins", "inject-rt-context.js");
    writeFileSync(rolePath, "custom role", "utf-8");
    writeFileSync(agentPath, "custom agent", "utf-8");
    writeFileSync(skillPath, "custom skill", "utf-8");
    writeFileSync(pluginPath, "custom plugin", "utf-8");

    chitkingInit(cwd);

    expect(readFileSync(rolePath, "utf-8")).toBe("custom role");
    expect(readFileSync(agentPath, "utf-8")).toBe("custom agent");
    expect(readFileSync(skillPath, "utf-8")).toBe("custom skill");
    expect(readFileSync(pluginPath, "utf-8")).toBe("custom plugin");
    expect(
      readFileSync(path.join(cwd, ".gitignore"), "utf-8").match(
        /research\/\*\/context\/\*\.yaml/g,
      ),
    ).toHaveLength(1);
  });

  it("uses existing config roles when creating missing role files on rerun", () => {
    const cwd = makeTempDir("chitking-init-custom-config-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    chitkingInit(cwd);
    writeFileSync(
      path.join(cwd, ".research-trellis", "config.yaml"),
      `schema_version: 1
maturity_ladder:
  - seed
readiness_thresholds:
  seed: 1
roles:
  critic:
    min_maturity: seed
    min_readiness: 1
    warnings:
      - Critic must stay advisory.
    prompt:
      objective: Critique the current research claim.
      stop_conditions:
        - The critique would mutate source files.
project_incomplete_markers:
  - TODO
`,
      "utf-8",
    );

    chitkingInit(cwd);

    const criticRole = readFileSync(
      path.join(cwd, ".research-trellis", "roles", "critic.md"),
      "utf-8",
    );
    const criticAgent = readFileSync(
      path.join(cwd, ".opencode", "agents", "rt-critic.md"),
      "utf-8",
    );
    expect(criticRole).toContain("Critique the current research claim.");
    expect(criticAgent).toContain("rt pack --role critic");
  });
});
