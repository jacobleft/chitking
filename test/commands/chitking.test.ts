import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parse } from "yaml";

import {
  chitkingArchive,
  chitkingDelete,
  chitkingFocus,
  chitkingInit,
  chitkingList,
  chitkingNew,
  chitkingOrient,
  chitkingPack,
  chitkingRecord,
  chitkingRename,
  chitkingRestore,
  chitkingShow,
  chitkingStep,
  createChitkingProgram,
  formatChitkingStatus,
  getChitkingStatus,
} from "../../src/index.js";

const tempDirs: string[] = [];
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
  "ck-pack",
  "ck-record",
] as const;
type ExpectedCkCommand = (typeof EXPECTED_CK_COMMANDS)[number];
const CK_COMMAND_SNIPPETS: Record<ExpectedCkCommand, string> = {
  "ck-init": "chitking init",
  "ck-new": 'chitking new "<thread title>"',
  "ck-list": "chitking list",
  "ck-show": "chitking show",
  "ck-focus": "chitking focus <thread-slug>",
  "ck-rename": 'chitking rename <thread-slug> "<new title>"',
  "ck-archive": "chitking archive <thread-slug> --yes",
  "ck-restore": "chitking restore <thread-slug>",
  "ck-delete": "chitking delete <thread-slug> --yes",
  "ck-orient": "chitking orient",
  "ck-step": "chitking step",
  "ck-pack": "chitking pack --role <role>",
  "ck-record": "chitking record --type <type> --text",
};

function makeTempDir(prefix: string): string {
  const tempDir = mkdtempSync(path.join(tmpdir(), prefix));
  tempDirs.push(tempDir);
  return tempDir;
}

function readText(filePath: string): string {
  return readFileSync(filePath, "utf-8");
}

function readFrontmatter(threadPath: string): Record<string, unknown> {
  const match = /^---\n([\s\S]*?)\n---/.exec(readText(threadPath));
  expect(match).not.toBeNull();
  return parse(match?.[1] ?? "") as Record<string, unknown>;
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
    expect(formatChitkingStatus(status)).toContain(
      "All Chitking scaffold and runtime command behavior is available",
    );
  });

  it("creates a Commander program with Chitking help metadata", () => {
    const program = createChitkingProgram();
    const help = program.helpInformation();

    expect(help).toContain("Usage: chitking");
    expect(help).toContain("Chitking (哲徑)");
    expect(help).toContain("--status");
    expect(help).toContain("init");
    expect(help).toContain("new");
    expect(help).toContain("list");
    expect(help).toContain("show");
    expect(help).toContain("focus");
    expect(help).toContain("rename");
    expect(help).toContain("archive");
    expect(help).toContain("restore");
    expect(help).toContain("delete");
    expect(help).toContain("orient");
    expect(help).toContain("step");
    expect(help).toContain("pack");
    expect(help).toContain("record");
    expect(help).not.toMatch(/^ {2}thread(?:\s|$)/m);
  });

  it("does not register the removed thread command namespace", () => {
    const program = createChitkingProgram();
    program.exitOverride();
    program.configureOutput({
      writeErr: () => undefined,
      writeOut: () => undefined,
    });

    expect(() =>
      program.parse(["thread", "new", "Contact Stability"], { from: "user" }),
    ).toThrow();
  });

  it("initializes the Chitking-native scaffold", () => {
    const cwd = makeTempDir("chitking-init-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    chitkingInit(cwd);

    expect(existsSync(path.join(cwd, ".chitking", "config.yaml"))).toBe(true);
    expect(existsSync(path.join(cwd, ".chitking", "active.yaml"))).toBe(true);
    expect(existsSync(path.join(cwd, "research", "project.md"))).toBe(true);
    expect(existsSync(path.join(cwd, ".chitking", "roles", "plan.md"))).toBe(true);
    expect(existsSync(path.join(cwd, ".opencode", "agents", "chitking-plan.md"))).toBe(true);
    expect(readdirSync(path.join(cwd, ".opencode", "commands")).sort()).toEqual(
      EXPECTED_CK_COMMANDS.map((command) => `${command}.md`).sort(),
    );
    expect(
      existsSync(path.join(cwd, ".opencode", "skills", "chitking-workflow", "SKILL.md")),
    ).toBe(true);
    expect(readdirSync(path.join(cwd, ".codex", "skills")).sort()).toEqual(
      [...EXPECTED_CK_COMMANDS].sort(),
    );
    expect(existsSync(path.join(cwd, ".codex", "config.toml"))).toBe(true);
    expect(
      existsSync(path.join(cwd, ".opencode", "plugins", "inject-chitking-context.js")),
    ).toBe(true);
    for (const command of EXPECTED_CK_COMMANDS) {
      const openCodeCommand = readFileSync(
        path.join(cwd, ".opencode", "commands", `${command}.md`),
        "utf-8",
      );
      const codexCommand = readFileSync(
        path.join(cwd, ".codex", "skills", command, "SKILL.md"),
        "utf-8",
      );
      expect(openCodeCommand).toContain("description:");
      expect(openCodeCommand).toContain(CK_COMMAND_SNIPPETS[command]);
      expect(openCodeCommand).toContain("$ARGUMENTS");
      expect(openCodeCommand).toContain("## Boundaries");
      expect(codexCommand).toContain(`name: ${command}`);
      expect(codexCommand).toContain(CK_COMMAND_SNIPPETS[command]);
      expect(codexCommand).toContain("$ARGUMENTS");
      expect(codexCommand).toContain("## Boundaries");
    }
    expect(readFileSync(path.join(cwd, ".opencode", "commands", "ck-step.md"), "utf-8")).toContain(
      "Humans own maturity/readiness",
    );
    expect(readFileSync(path.join(cwd, ".codex", "skills", "ck-delete", "SKILL.md"), "utf-8")).toContain(
      "Do not add `--yes` unless the user clearly asked to delete",
    );
    expect(readFileSync(path.join(cwd, ".gitignore"), "utf-8")).toContain(
      "research/*/context/*.yaml",
    );
  });

  it("preserves user-edited generated files on repeated init", () => {
    const cwd = makeTempDir("chitking-init-preserve-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    chitkingInit(cwd);
    const rolePath = path.join(cwd, ".chitking", "roles", "plan.md");
    const agentPath = path.join(cwd, ".opencode", "agents", "chitking-plan.md");
    const openCodeCommandPath = path.join(cwd, ".opencode", "commands", "ck-new.md");
    const codexConfigPath = path.join(cwd, ".codex", "config.toml");
    const codexCommandPath = path.join(cwd, ".codex", "skills", "ck-new", "SKILL.md");
    const skillPath = path.join(cwd, ".opencode", "skills", "chitking-workflow", "SKILL.md");
    const pluginPath = path.join(cwd, ".opencode", "plugins", "inject-chitking-context.js");
    writeFileSync(rolePath, "custom role", "utf-8");
    writeFileSync(agentPath, "custom agent", "utf-8");
    writeFileSync(openCodeCommandPath, "custom opencode command", "utf-8");
    writeFileSync(codexConfigPath, "custom codex config", "utf-8");
    writeFileSync(codexCommandPath, "custom codex command", "utf-8");
    writeFileSync(skillPath, "custom skill", "utf-8");
    writeFileSync(pluginPath, "custom plugin", "utf-8");

    chitkingInit(cwd);

    expect(readFileSync(rolePath, "utf-8")).toBe("custom role");
    expect(readFileSync(agentPath, "utf-8")).toBe("custom agent");
    expect(readFileSync(openCodeCommandPath, "utf-8")).toBe("custom opencode command");
    expect(readFileSync(codexConfigPath, "utf-8")).toBe("custom codex config");
    expect(readFileSync(codexCommandPath, "utf-8")).toBe("custom codex command");
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
      path.join(cwd, ".chitking", "config.yaml"),
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
      path.join(cwd, ".chitking", "roles", "critic.md"),
      "utf-8",
    );
    const criticAgent = readFileSync(
      path.join(cwd, ".opencode", "agents", "chitking-critic.md"),
      "utf-8",
    );
    expect(criticRole).toContain("Critique the current research claim.");
    expect(criticAgent).toContain("chitking pack --role critic");
  });

  it("OpenCode plugin injects role context and main breadcrumbs", async () => {
    const cwd = makeTempDir("chitking-plugin-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", {}, cwd);
    const pluginPath = path.join(
      cwd,
      ".opencode",
      "plugins",
      "inject-chitking-context.js",
    );
    const mod = (await import(
      `${pathToFileURL(pluginPath).href}?case=${Date.now()}`
    )) as {
      default: (input: { directory: string }) => Promise<Record<string, unknown>>;
    };
    const hooks = (await mod.default({ directory: cwd })) as {
      "tool.execute.before": (
        input: Record<string, unknown>,
        output: { args?: Record<string, unknown> },
      ) => Promise<void>;
      "chat.message": (
        input: Record<string, unknown>,
        output: { parts?: { type: string; text?: string }[] },
      ) => Promise<void>;
    };

    const unrelated = {
      args: { subagent_type: "trellis-implement", prompt: "do work" },
    };
    await hooks["tool.execute.before"]({ tool: "Task" }, unrelated);
    expect(unrelated.args.prompt).toBe("do work");

    const roleCall = {
      args: { subagent_type: "chitking-build", prompt: "implement approved action" },
    };
    await hooks["tool.execute.before"]({ tool: "Task" }, roleCall);
    expect(roleCall.args.prompt).toContain("<!-- chitking-context-injected -->");
    expect(roleCall.args.prompt).toContain("Role: build");
    expect(roleCall.args.prompt).toContain("Active thread: contact-stability");
    expect(roleCall.args.prompt).toContain("Maturity: seed");
    expect(roleCall.args.prompt).toContain("Readiness: 1 (human)");
    expect(roleCall.args.prompt).toContain("Project file: research/project.md");
    expect(roleCall.args.prompt).toContain(
      "Thread file: research/contact-stability/thread.md",
    );
    expect(roleCall.args.prompt).toContain("chitking pack --role build");
    expect(roleCall.args.prompt).toContain("readiness 1 is below role minimum 4");
    expect(roleCall.args.prompt).toContain(
      "maturity seed is before role minimum implementation-ready",
    );
    expect(roleCall.args.prompt).toContain("Humans own maturity/readiness");
    expect(roleCall.args.prompt).toContain(
      "Dreamer must not create implementation tasks",
    );
    expect(roleCall.args.prompt).toContain("implement approved action");

    const chatOutput = { parts: [{ type: "text", text: "user request" }] };
    await hooks["chat.message"]({ agent: "main" }, chatOutput);
    expect(chatOutput.parts[0].text).toContain("<chitking-breadcrumb>");
    expect(chatOutput.parts[0].text).toContain(
      "Active Chitking thread: contact-stability",
    );
    expect(chatOutput.parts[0].text).toContain("Maturity: seed");
    expect(chatOutput.parts[0].text).toContain("Readiness: 1 (human)");
    expect(chatOutput.parts[0].text).toContain("user request");

    const roleChatOutput = { parts: [{ type: "text", text: "role turn" }] };
    await hooks["chat.message"]({ agent: "chitking-dreamer" }, roleChatOutput);
    expect(roleChatOutput.parts[0].text).toBe("role turn");
  });

  it("creates a slugged source-of-truth thread and focuses it", () => {
    const cwd = makeTempDir("chitking-thread-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);

    const slug = chitkingNew("Contact Stability", {}, cwd);

    expect(slug).toBe("contact-stability");
    const threadPath = path.join(cwd, "research", slug, "thread.md");
    expect(existsSync(threadPath)).toBe(true);
    expect(existsSync(path.join(cwd, "research", slug, "context"))).toBe(true);
    expect(readFrontmatter(threadPath)).toMatchObject({
      thread: "contact-stability",
      title: "Contact Stability",
      maturity: "seed",
      readiness: 1,
      readiness_source: "human",
      recorded_commits: [],
    });
    expect(readText(threadPath)).toContain("## Theory Brief");
    expect(readText(path.join(cwd, ".chitking", "active.yaml"))).toContain(
      "active_thread: contact-stability",
    );
  });

  it("list, show, and focus inspect or set active threads", () => {
    const cwd = makeTempDir("chitking-focus-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", {}, cwd);
    chitkingNew("Friction Model", {}, cwd);
    const firstThreadPath = path.join(cwd, "research", "contact-stability", "thread.md");
    const before = readText(firstThreadPath);

    expect(chitkingList(cwd)).toContain("friction-model — Friction Model");
    expect(chitkingShow(undefined, cwd)).toContain("Thread: friction-model");
    expect(chitkingFocus("contact-stability", cwd)).toBe("contact-stability");
    expect(chitkingShow(undefined, cwd)).toContain("Thread: contact-stability");
    expect(readText(firstThreadPath)).toBe(before);
  });

  it("rename updates the human title without changing slug or active pointer", () => {
    const cwd = makeTempDir("chitking-rename-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", {}, cwd);

    chitkingRename("contact-stability", "Contact Stability Revisited", cwd);

    const threadPath = path.join(cwd, "research", "contact-stability", "thread.md");
    expect(existsSync(threadPath)).toBe(true);
    expect(readFrontmatter(threadPath)).toMatchObject({
      thread: "contact-stability",
      title: "Contact Stability Revisited",
    });
    expect(readText(path.join(cwd, ".chitking", "active.yaml"))).toContain(
      "active_thread: contact-stability",
    );
  });

  it("archive requires confirmation, hides a thread, and restore makes it focusable", () => {
    const cwd = makeTempDir("chitking-archive-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", {}, cwd);

    expect(() => chitkingArchive("contact-stability", {}, cwd)).toThrow(
      "chitking archive requires --yes",
    );
    chitkingArchive("contact-stability", { yes: true }, cwd);

    const threadPath = path.join(cwd, "research", "contact-stability", "thread.md");
    expect(readFrontmatter(threadPath).archived).toBe(true);
    expect(chitkingList(cwd)).not.toContain("contact-stability");
    expect(chitkingShow("contact-stability", cwd)).toContain("Archived: yes");
    expect(() => chitkingFocus("contact-stability", cwd)).toThrow(
      "Thread is archived: contact-stability",
    );
    expect(readText(path.join(cwd, ".chitking", "active.yaml"))).toContain(
      "active_thread: null",
    );

    chitkingRestore("contact-stability", cwd);

    expect(readFrontmatter(threadPath).archived).toBeUndefined();
    expect(chitkingFocus("contact-stability", cwd)).toBe("contact-stability");
  });

  it("delete requires confirmation, removes the thread directory, and clears active", () => {
    const cwd = makeTempDir("chitking-delete-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", {}, cwd);

    expect(() => chitkingDelete("contact-stability", {}, cwd)).toThrow(
      "chitking delete requires --yes",
    );
    expect(existsSync(path.join(cwd, "research", "contact-stability"))).toBe(true);

    chitkingDelete("contact-stability", { yes: true }, cwd);

    expect(existsSync(path.join(cwd, "research", "contact-stability"))).toBe(false);
    expect(readText(path.join(cwd, ".chitking", "active.yaml"))).toContain(
      "active_thread: null",
    );
  });

  it("step advances maturity, requires reasons, and appends history", () => {
    const cwd = makeTempDir("chitking-step-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", {}, cwd);

    chitkingStep({}, cwd);
    let frontmatter = readFrontmatter(path.join(cwd, "research", "contact-stability", "thread.md"));
    expect(frontmatter.maturity).toBe("briefed");
    expect(frontmatter.readiness).toBe(1);
    expect(() => chitkingStep({ to: "gap-identified" }, cwd)).toThrow(
      "chitking step --to requires --reason",
    );

    chitkingStep({ to: "gap-identified", readiness: 2, reason: "human accepted the gap" }, cwd);
    const threadPath = path.join(cwd, "research", "contact-stability", "thread.md");
    frontmatter = readFrontmatter(threadPath);
    expect(frontmatter.maturity).toBe("gap-identified");
    expect(frontmatter.readiness).toBe(2);
    expect(readText(threadPath)).toContain("Reason: human accepted the gap");
  });

  it("pack writes role YAML with file references instead of markdown content", () => {
    const cwd = makeTempDir("chitking-pack-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", {}, cwd);

    const packetPath = chitkingPack({ role: "build" }, cwd);

    expect(packetPath).toBe("research/contact-stability/context/build.yaml");
    const packet = parse(readText(path.join(cwd, packetPath))) as Record<string, unknown>;
    expect(packet).toMatchObject({
      role: "build",
      thread: "contact-stability",
      project_file: "research/project.md",
      thread_file: "research/contact-stability/thread.md",
      maturity: "seed",
      readiness: 1,
      source_thread_updated_at: readFrontmatter(
        path.join(cwd, "research", "contact-stability", "thread.md"),
      ).updated_at,
    });
    expect(readText(path.join(cwd, packetPath))).not.toContain("## Theory Brief");
    expect(readText(path.join(cwd, packetPath))).toContain("readiness 1 is below");
  });

  it("pack writes Dreamer packet with ideation boundaries", () => {
    const cwd = makeTempDir("chitking-dreamer-pack-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", {}, cwd);

    const packetPath = chitkingPack({ role: "dreamer" }, cwd);

    expect(packetPath).toBe("research/contact-stability/context/dreamer.yaml");
    const packet = parse(readText(path.join(cwd, packetPath))) as Record<
      string,
      unknown
    >;
    expect(packet).toMatchObject({
      role: "dreamer",
      thread: "contact-stability",
      project_file: "research/project.md",
      thread_file: "research/contact-stability/thread.md",
      maturity: "seed",
      readiness: 1,
    });
    const packetText = readText(path.join(cwd, packetPath));
    expect(packetText).toContain("Generate hypotheses, strange analogies");
    expect(packetText).toContain("do not create implementation tasks");
    expect(packetText).toContain("hand work directly to build or Executor");
    expect(packetText).not.toContain("readiness 1 is below role minimum");
  });

  it("orient reports maturity/readiness plus incomplete project and stale packet warnings", () => {
    const cwd = makeTempDir("chitking-orient-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", {}, cwd);
    chitkingPack({ role: "build" }, cwd);
    chitkingStep({}, cwd);

    const output = chitkingOrient(cwd);

    expect(output).toContain("Active thread: contact-stability");
    expect(output).toContain("Maturity: briefed");
    expect(output).toContain("Readiness: 1 (human)");
    expect(output).toContain("research/project.md appears incomplete");
    expect(output).toContain("Generated context packet may be stale: build.yaml");
    expect(output).toContain("Allowed-but-risky roles:");
    expect(output).toContain("Recovery options if stuck:");
  });

  it("orient checks repo activity beyond thread.md without active-pointer noise", () => {
    const cwd = makeTempDir("chitking-git-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", {}, cwd);
    chitkingNew("Friction Model", {}, cwd);
    execFileSync("git", ["init"], { cwd, stdio: "ignore" });
    execFileSync("git", ["config", "user.email", "test@example.com"], { cwd, stdio: "ignore" });
    execFileSync("git", ["config", "user.name", "Test User"], { cwd, stdio: "ignore" });
    execFileSync("git", ["add", "."], { cwd, stdio: "ignore" });
    execFileSync("git", ["commit", "-m", "seed research harness"], { cwd, stdio: "ignore" });

    chitkingFocus("contact-stability", cwd);
    expect(chitkingOrient(cwd)).not.toContain("Dirty working tree may contain");
    writeFileSync(path.join(cwd, "model.ts"), "export const model = 1;\n", "utf-8");
    expect(chitkingOrient(cwd)).toContain("Dirty working tree may contain");
    execFileSync("git", ["add", "model.ts"], { cwd, stdio: "ignore" });
    execFileSync("git", ["commit", "-m", "record model progress"], { cwd, stdio: "ignore" });
    expect(chitkingOrient(cwd)).toContain("Recent repository commits are not listed in recorded_commits.");
  });

  it("record appends factual output and can add resolved commits", () => {
    const cwd = makeTempDir("chitking-record-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", {}, cwd);
    execFileSync("git", ["init"], { cwd, stdio: "ignore" });
    execFileSync("git", ["config", "user.email", "test@example.com"], { cwd, stdio: "ignore" });
    execFileSync("git", ["config", "user.name", "Test User"], { cwd, stdio: "ignore" });
    execFileSync("git", ["add", "."], { cwd, stdio: "ignore" });
    execFileSync("git", ["commit", "-m", "seed research thread"], { cwd, stdio: "ignore" });
    const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf-8" }).trim();

    chitkingRecord({ type: "evidence", commit: "HEAD", text: "Verification passed on fixture A." }, cwd);

    const threadPath = path.join(cwd, "research", "contact-stability", "thread.md");
    expect(readText(threadPath)).toContain("Verification passed on fixture A.");
    expect(readFrontmatter(threadPath).recorded_commits).toEqual([head]);
  });
});
