import {
  existsSync,
  mkdtempSync,
  mkdirSync,
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
  chitkingAssess,
  chitkingDelete,
  chitkingDispatch,
  chitkingFocus,
  chitkingInit,
  chitkingIterate,
  chitkingList,
  chitkingMature,
  chitkingNew,
  chitkingOrient,
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
  "ck-assess",
  "ck-iterate",
  "ck-mature",
  "ck-step",
  "ck-dispatch",
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
  "ck-assess": "chitking assess [thread]",
  "ck-iterate": 'chitking iterate "<thread title>" [--slug <slug>]',
  "ck-mature": 'chitking mature --to <level> --reason "<human reason>"',
  "ck-step": "chitking step",
  "ck-dispatch": "chitking dispatch [--role <role>]",
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
    expect(help).toContain("assess");
    expect(help).toContain("iterate");
    expect(help).toContain("mature");
    expect(help).toContain("step");
    expect(help).toContain("dispatch");
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
    expect(existsSync(path.join(cwd, ".chitking", "roles", "plan.md"))).toBe(
      true,
    );
    expect(
      existsSync(path.join(cwd, ".opencode", "agents", "chitking-plan.md")),
    ).toBe(true);
    expect(readdirSync(path.join(cwd, ".opencode", "commands")).sort()).toEqual(
      EXPECTED_CK_COMMANDS.map((command) => `${command}.md`).sort(),
    );
    expect(
      existsSync(
        path.join(cwd, ".opencode", "skills", "chitking-workflow", "SKILL.md"),
      ),
    ).toBe(true);
    expect(readdirSync(path.join(cwd, ".codex", "skills")).sort()).toEqual(
      [...EXPECTED_CK_COMMANDS].sort(),
    );
    expect(existsSync(path.join(cwd, ".codex", "config.toml"))).toBe(true);
    expect(
      existsSync(
        path.join(cwd, ".opencode", "plugins", "inject-chitking-context.js"),
      ),
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
    expect(
      readFileSync(
        path.join(cwd, ".opencode", "commands", "ck-step.md"),
        "utf-8",
      ),
    ).toContain("Humans own stage/readiness");
    expect(
      readFileSync(
        path.join(cwd, ".codex", "skills", "ck-delete", "SKILL.md"),
        "utf-8",
      ),
    ).toContain("Do not add `--yes` unless the user clearly asked to delete");
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
    const openCodeCommandPath = path.join(
      cwd,
      ".opencode",
      "commands",
      "ck-new.md",
    );
    const codexConfigPath = path.join(cwd, ".codex", "config.toml");
    const codexCommandPath = path.join(
      cwd,
      ".codex",
      "skills",
      "ck-new",
      "SKILL.md",
    );
    const skillPath = path.join(
      cwd,
      ".opencode",
      "skills",
      "chitking-workflow",
      "SKILL.md",
    );
    const pluginPath = path.join(
      cwd,
      ".opencode",
      "plugins",
      "inject-chitking-context.js",
    );
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
    expect(readFileSync(openCodeCommandPath, "utf-8")).toBe(
      "custom opencode command",
    );
    expect(readFileSync(codexConfigPath, "utf-8")).toBe("custom codex config");
    expect(readFileSync(codexCommandPath, "utf-8")).toBe(
      "custom codex command",
    );
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
stages:
  - seed
stage_advancement:
  seed: 1
roles:
  critic:
    min_stage: seed
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
    expect(criticAgent).toContain("chitking dispatch --role critic");
  });

  it("OpenCode plugin injects role context and main breadcrumbs", async () => {
    const cwd = makeTempDir("chitking-plugin-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", { noDispatch: true }, cwd);
    const pluginPath = path.join(
      cwd,
      ".opencode",
      "plugins",
      "inject-chitking-context.js",
    );
    const mod = (await import(
      `${pathToFileURL(pluginPath).href}?case=${Date.now()}`
    )) as {
      default: (input: {
        directory: string;
      }) => Promise<Record<string, unknown>>;
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
      args: {
        subagent_type: "chitking-build",
        prompt: "implement approved action",
      },
    };
    await hooks["tool.execute.before"]({ tool: "Task" }, roleCall);
    expect(roleCall.args.prompt).toContain(
      "<!-- chitking-context-injected -->",
    );
    expect(roleCall.args.prompt).toContain("Role: build");
    expect(roleCall.args.prompt).toContain("Active thread: contact-stability");
    expect(roleCall.args.prompt).toContain("Stage: seed");
    expect(roleCall.args.prompt).toContain("Maturity: nascent");
    expect(roleCall.args.prompt).toContain("Readiness: 1 (human)");
    expect(roleCall.args.prompt).toContain("Project file: research/project.md");
    expect(roleCall.args.prompt).toContain(
      "Thread file: research/contact-stability/thread.md",
    );
    expect(roleCall.args.prompt).toContain("chitking dispatch --role build");
    expect(roleCall.args.prompt).toContain(
      "readiness 1 is below role minimum 4",
    );
    expect(roleCall.args.prompt).toContain(
      "stage seed is before role minimum implementation-ready",
    );
    expect(roleCall.args.prompt).toContain("Humans own stage/readiness");
    expect(roleCall.args.prompt).toContain(
      "Dreamer must not create implementation tasks",
    );
    expect(roleCall.args.prompt).toContain("implement approved action");

    const chatOutput = { parts: [{ type: "text", text: "user request" }] };
    await hooks["chat.message"]({ agent: "main" }, chatOutput);
    expect(chatOutput.parts[0].text).toContain("<chitking-breadcrumb>");
    expect(chatOutput.parts[0].text).toContain("Thread: contact-stability");
    expect(chatOutput.parts[0].text).toContain("Stages: [seed] → briefed");
    expect(chatOutput.parts[0].text).toContain("→ (loop)");
    expect(chatOutput.parts[0].text).toContain(
      "Readiness: 1/5 — need ≥1 to advance to briefed ✓ ready",
    );
    expect(chatOutput.parts[0].text).toContain(
      "Maturity: nascent (whole-thread quality)",
    );
    expect(chatOutput.parts[0].text).toContain("Next: Thread is at seed stage");
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
      stage: "seed",
      maturity: "nascent",
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
    const firstThreadPath = path.join(
      cwd,
      "research",
      "contact-stability",
      "thread.md",
    );
    const before = readText(firstThreadPath);

    expect(chitkingList(cwd)).toContain("friction-model — Friction Model");

    const showFriction = chitkingShow(undefined, cwd);
    expect(showFriction).toContain("Thread: friction-model");
    expect(showFriction).toContain("Title: Friction Model");
    expect(showFriction).toContain("Stages:");
    expect(showFriction).toContain("[seed]");
    expect(showFriction).toContain("→ (loop)");
    expect(showFriction).toContain(
      "Readiness: 1/5 — need ≥1 to advance to briefed ✓ ready",
    );

    expect(chitkingFocus("contact-stability", {}, cwd)).toBe(
      "contact-stability",
    );

    const showContact = chitkingShow(undefined, cwd);
    expect(showContact).toContain("Thread: contact-stability");
    expect(showContact).toContain("Title: Contact Stability");
    expect(showContact).toContain("Stages:");
    expect(showContact).toContain("[seed]");
    expect(showContact).toContain("→ (loop)");
    expect(showContact).toContain(
      "Readiness: 1/5 — need ≥1 to advance to briefed ✓ ready",
    );
    expect(readText(firstThreadPath)).toBe(before);
  });

  it("rename updates the human title without changing slug or active pointer", () => {
    const cwd = makeTempDir("chitking-rename-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", {}, cwd);

    chitkingRename("contact-stability", "Contact Stability Revisited", cwd);

    const threadPath = path.join(
      cwd,
      "research",
      "contact-stability",
      "thread.md",
    );
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

    const threadPath = path.join(
      cwd,
      "research",
      "contact-stability",
      "thread.md",
    );
    expect(readFrontmatter(threadPath).archived).toBe(true);
    expect(chitkingList(cwd)).not.toContain("contact-stability");
    expect(chitkingShow("contact-stability", cwd)).toContain("Archived: yes");
    expect(() => chitkingFocus("contact-stability", {}, cwd)).toThrow(
      "Thread is archived: contact-stability",
    );
    expect(readText(path.join(cwd, ".chitking", "active.yaml"))).toContain(
      "active_thread: null",
    );

    chitkingRestore("contact-stability", cwd);

    expect(readFrontmatter(threadPath).archived).toBeUndefined();
    expect(chitkingFocus("contact-stability", {}, cwd)).toBe(
      "contact-stability",
    );
  });

  it("delete requires confirmation, removes the thread directory, and clears active", () => {
    const cwd = makeTempDir("chitking-delete-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", {}, cwd);

    expect(() => chitkingDelete("contact-stability", {}, cwd)).toThrow(
      "chitking delete requires --yes",
    );
    expect(existsSync(path.join(cwd, "research", "contact-stability"))).toBe(
      true,
    );

    chitkingDelete("contact-stability", { yes: true }, cwd);

    expect(existsSync(path.join(cwd, "research", "contact-stability"))).toBe(
      false,
    );
    expect(readText(path.join(cwd, ".chitking", "active.yaml"))).toContain(
      "active_thread: null",
    );
  });

  it("step advances stage, resets readiness, requires reasons, and appends history", () => {
    const cwd = makeTempDir("chitking-step-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", {}, cwd);

    chitkingStep({}, cwd);
    let frontmatter = readFrontmatter(
      path.join(cwd, "research", "contact-stability", "thread.md"),
    );
    expect(frontmatter.stage).toBe("briefed");
    expect(frontmatter.maturity).toBe("nascent");
    expect(frontmatter.readiness).toBe(1);
    expect(() => chitkingStep({ to: "gap-identified" }, cwd)).toThrow(
      "chitking step --to requires --reason",
    );

    chitkingStep(
      { to: "gap-identified", readiness: 2, reason: "human accepted the gap" },
      cwd,
    );
    const threadPath = path.join(
      cwd,
      "research",
      "contact-stability",
      "thread.md",
    );
    frontmatter = readFrontmatter(threadPath);
    expect(frontmatter.stage).toBe("gap-identified");
    expect(frontmatter.readiness).toBe(2);
    expect(readText(threadPath)).toContain("Reason: human accepted the gap");

    // Forward step without explicit --readiness resets readiness to 1 (PRD: resets on every step).
    chitkingStep({ to: "specified", reason: "moving forward" }, cwd);
    frontmatter = readFrontmatter(threadPath);
    expect(frontmatter.stage).toBe("specified");
    expect(frontmatter.readiness).toBe(1);
  });

  it("step loops back to seed at the final stage and appends a cycle marker", () => {
    const cwd = makeTempDir("chitking-step-loop-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", { noDispatch: true }, cwd);
    const threadPath = path.join(
      cwd,
      "research",
      "contact-stability",
      "thread.md",
    );

    // Advance to final stage
    const stages = [
      "briefed",
      "gap-identified",
      "specified",
      "verification-planned",
      "implementation-ready",
      "evidence-recorded",
      "synthesis-ready",
    ];
    for (const stage of stages) {
      chitkingStep({ to: stage, reason: `advance to ${stage}` }, cwd);
    }

    let frontmatter = readFrontmatter(threadPath);
    expect(frontmatter.stage).toBe("synthesis-ready");

    // Loop back
    chitkingStep({ noDispatch: true }, cwd);
    frontmatter = readFrontmatter(threadPath);
    expect(frontmatter.stage).toBe("seed");
    expect(frontmatter.readiness).toBe(1);
    expect(readText(threadPath)).toContain(
      "cycle complete; looped synthesis-ready→seed; readiness reset to 1.",
    );
  });

  it("step loop-back forces readiness reset to 1 even when --readiness is provided", () => {
    const cwd = makeTempDir("chitking-step-loop-override-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", { noDispatch: true }, cwd);
    const threadPath = path.join(
      cwd,
      "research",
      "contact-stability",
      "thread.md",
    );

    // Advance to final stage with high readiness.
    const stages = [
      "briefed",
      "gap-identified",
      "specified",
      "verification-planned",
      "implementation-ready",
      "evidence-recorded",
      "synthesis-ready",
    ];
    for (const stage of stages) {
      chitkingStep(
        { to: stage, readiness: 5, reason: `advance to ${stage}` },
        cwd,
      );
    }
    expect(readFrontmatter(threadPath).stage).toBe("synthesis-ready");

    // Loop back with explicit --readiness; loop-back must still force reset to 1.
    chitkingStep({ readiness: 5, noDispatch: true }, cwd);
    const frontmatter = readFrontmatter(threadPath);
    expect(frontmatter.stage).toBe("seed");
    expect(frontmatter.readiness).toBe(1);
    expect(readText(threadPath)).toContain("readiness reset to 1.");
  });

  it("mature updates maturity, appends history, and auto-dispatches", () => {
    const cwd = makeTempDir("chitking-mature-");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", { noDispatch: true }, cwd);
    const threadPath = path.join(
      cwd,
      "research",
      "contact-stability",
      "thread.md",
    );

    chitkingMature(
      { to: "developing", reason: "theory brief and claim are now explicit" },
      cwd,
    );

    const frontmatter = readFrontmatter(threadPath);
    expect(frontmatter.maturity).toBe("developing");
    expect(frontmatter.stage).toBe("seed");
    expect(readText(threadPath)).toContain(
      "maturity nascent→developing. Reason: theory brief and claim are now explicit",
    );
    expect(logSpy).toHaveBeenCalledWith(
      "Maturity updated: contact-stability nascent → developing",
    );
    expect(logSpy).toHaveBeenCalledWith(
      "Dispatched 7 role packets for contact-stability.",
    );
    expect(
      existsSync(
        path.join(
          cwd,
          "research",
          "contact-stability",
          "context",
          "build.yaml",
        ),
      ),
    ).toBe(true);
  });

  it("mature requires --to and --reason", () => {
    const cwd = makeTempDir("chitking-mature-validation-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", { noDispatch: true }, cwd);

    expect(() =>
      // @ts-expect-error intentionally testing runtime validation for missing `to`
      chitkingMature({ reason: "missing target" }, cwd),
    ).toThrow("Unknown maturity level: undefined");
    expect(() =>
      // @ts-expect-error intentionally testing runtime validation for missing `reason`
      chitkingMature({ to: "developing" }, cwd),
    ).toThrow("chitking mature requires --reason.");
    expect(() =>
      chitkingMature({ to: "developing", reason: "   " }, cwd),
    ).toThrow("chitking mature requires --reason.");
  });

  it("mature validates --to against config maturity levels", () => {
    const cwd = makeTempDir("chitking-mature-unknown-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", { noDispatch: true }, cwd);

    expect(() =>
      chitkingMature({ to: "transcendent", reason: "unknown level" }, cwd),
    ).toThrow("Unknown maturity level: transcendent");
  });

  it("mature --no-dispatch skips auto-dispatch", () => {
    const cwd = makeTempDir("chitking-mature-no-dispatch-");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", { noDispatch: true }, cwd);

    chitkingMature(
      { to: "developing", reason: "no dispatch this time", noDispatch: true },
      cwd,
    );

    expect(
      readFrontmatter(
        path.join(cwd, "research", "contact-stability", "thread.md"),
      ).maturity,
    ).toBe("developing");
    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Dispatched"),
    );
    expect(
      existsSync(
        path.join(
          cwd,
          "research",
          "contact-stability",
          "context",
          "build.yaml",
        ),
      ),
    ).toBe(false);
  });

  it("CLI mature --no-dispatch flag skips auto-dispatch through the option-parsing layer", () => {
    const cwd = makeTempDir("chitking-cli-mature-no-dispatch-");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd, { noDispatch: true });
    chitkingNew("Contact Stability", { noDispatch: true }, cwd);
    const originalCwd = process.cwd();
    process.chdir(cwd);
    try {
      const program = createChitkingProgram();
      program.parse(
        [
          "mature",
          "--to",
          "developing",
          "--reason",
          "cli test",
          "--no-dispatch",
        ],
        { from: "user" },
      );

      expect(logSpy).toHaveBeenCalledWith(
        "Maturity updated: contact-stability nascent → developing",
      );
      expect(logSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("Dispatched"),
      );
      expect(
        existsSync(
          path.join(
            cwd,
            "research",
            "contact-stability",
            "context",
            "build.yaml",
          ),
        ),
      ).toBe(false);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it("new threads include the holistic maturity field defaulting to nascent", () => {
    const cwd = makeTempDir("chitking-maturity-field-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);

    chitkingNew("Contact Stability", { noDispatch: true }, cwd);

    const threadPath = path.join(
      cwd,
      "research",
      "contact-stability",
      "thread.md",
    );
    const frontmatter = readFrontmatter(threadPath);
    expect(frontmatter).toMatchObject({
      stage: "seed",
      maturity: "nascent",
      readiness: 1,
    });
  });

  it("reads legacy frontmatter with maturity as stage and warns once", () => {
    const cwd = makeTempDir("chitking-backward-compat-");
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    const threadDir = path.join(cwd, "research", "legacy-thread");
    mkdirSync(threadDir, { recursive: true });
    mkdirSync(path.join(threadDir, "context"), { recursive: true });
    writeFileSync(
      path.join(threadDir, "thread.md"),
      `---
thread: legacy-thread
title: Legacy Thread
maturity: seed
readiness: 1
readiness_source: human
recorded_commits: []
updated_at: 2026-06-15T00:00:00.000Z
---
## Theory Brief

legacy.
`,
      "utf-8",
    );
    writeFileSync(
      path.join(cwd, ".chitking", "active.yaml"),
      `active_thread: legacy-thread\nupdated_at: 2026-06-15T00:00:00.000Z\n`,
      "utf-8",
    );

    const output = chitkingShow("legacy-thread", cwd);

    expect(output).toContain("Thread: legacy-thread");
    expect(output).toContain("Title: Legacy Thread");
    expect(output).toContain("Stages:");
    expect(output).toContain("[seed]");
    expect(output).toContain("Maturity: nascent");
    expect(warnSpy).toHaveBeenCalledWith(
      "Migrating frontmatter: maturity→stage. Run chitking show to verify.",
    );
  });

  it("dispatch writes role YAML with file references instead of markdown content", () => {
    const cwd = makeTempDir("chitking-dispatch-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", { noDispatch: true }, cwd);

    const packetPath = chitkingDispatch({ role: "build" }, cwd);

    expect(packetPath).toBe("research/contact-stability/context/build.yaml");
    const packet = parse(readText(path.join(cwd, packetPath))) as Record<
      string,
      unknown
    >;
    expect(packet).toMatchObject({
      role: "build",
      thread: "contact-stability",
      project_file: "research/project.md",
      thread_file: "research/contact-stability/thread.md",
      stage: "seed",
      maturity: "nascent",
      readiness: 1,
      source_thread_updated_at: readFrontmatter(
        path.join(cwd, "research", "contact-stability", "thread.md"),
      ).updated_at,
    });
    expect(readText(path.join(cwd, packetPath))).not.toContain(
      "## Theory Brief",
    );
    expect(readText(path.join(cwd, packetPath))).toContain(
      "readiness 1 is below",
    );
  });

  it("dispatch writes Dreamer packet with ideation boundaries", () => {
    const cwd = makeTempDir("chitking-dreamer-dispatch-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", { noDispatch: true }, cwd);

    const packetPath = chitkingDispatch({ role: "dreamer" }, cwd);

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
      stage: "seed",
      maturity: "nascent",
      readiness: 1,
    });
    const packetText = readText(path.join(cwd, packetPath));
    expect(packetText).toContain("Generate hypotheses, strange analogies");
    expect(packetText).toContain("do not create implementation tasks");
    expect(packetText).toContain("hand work directly to build or Executor");
    expect(packetText).not.toContain("readiness 1 is below role minimum");
  });

  it("dispatch generates packets for all configured roles", () => {
    const cwd = makeTempDir("chitking-dispatch-all-");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", { noDispatch: true }, cwd);

    const output = chitkingDispatch({}, cwd);

    const expectedRoles = [
      "build",
      "dreamer",
      "oracle",
      "plan",
      "review",
      "synthesize",
      "verify",
    ];
    for (const role of expectedRoles) {
      const packetRepoPath = `research/contact-stability/context/${role}.yaml`;
      expect(output).toContain(packetRepoPath);
      expect(logSpy).toHaveBeenCalledWith(packetRepoPath);
      expect(existsSync(path.join(cwd, packetRepoPath))).toBe(true);
    }
  });

  it("orient reports stage/maturity/readiness plus incomplete project and stale packet warnings", () => {
    const cwd = makeTempDir("chitking-orient-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", { noDispatch: true }, cwd);
    chitkingDispatch({ role: "build" }, cwd);
    chitkingStep({ noDispatch: true }, cwd);

    const output = chitkingOrient(cwd);

    expect(output).toContain("Thread: contact-stability");
    expect(output).toContain("Title: Contact Stability");
    expect(output).toContain("Stages:");
    expect(output).toContain("[briefed]");
    expect(output).toContain("→ (loop)");
    expect(output).toContain(
      "Readiness: 1/5 — need ≥1 to advance to gap-identified ✓ ready",
    );
    expect(output).toContain("Maturity: nascent (whole-thread quality)");
    expect(output).toContain("Issues:");
    expect(output).toContain("research/project.md appears incomplete");
    expect(output).toContain(
      "Generated context packet may be stale: build.yaml",
    );
    expect(output).toContain("Next steps:");
    expect(output).toContain(
      "chitking assess — evaluate content against stage criteria",
    );
    expect(output).toContain(
      'chitking step --to gap-identified --reason "..." — advance to next stage',
    );
    expect(output).toContain("chitking dispatch — refresh role packets");
    expect(output).toContain(
      '- chitking record --type failure --text "..." — record a failed path',
    );
    expect(output).not.toContain("Allowed-but-risky roles:");
    expect(output).not.toContain("Warnings / blockers:");
    expect(output).not.toContain("Recovery options if stuck:");
    expect(output).not.toContain("Recommended next safe actions:");
  });

  it("orient checks repo activity beyond thread.md without active-pointer noise", () => {
    const cwd = makeTempDir("chitking-git-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", {}, cwd);
    chitkingNew("Friction Model", {}, cwd);
    execFileSync("git", ["init"], { cwd, stdio: "ignore" });
    execFileSync("git", ["config", "user.email", "test@example.com"], {
      cwd,
      stdio: "ignore",
    });
    execFileSync("git", ["config", "user.name", "Test User"], {
      cwd,
      stdio: "ignore",
    });
    execFileSync("git", ["add", "."], { cwd, stdio: "ignore" });
    execFileSync("git", ["commit", "-m", "seed research harness"], {
      cwd,
      stdio: "ignore",
    });

    chitkingFocus("contact-stability", {}, cwd);
    expect(chitkingOrient(cwd)).not.toContain("Dirty working tree may contain");
    writeFileSync(
      path.join(cwd, "model.ts"),
      "export const model = 1;\n",
      "utf-8",
    );
    expect(chitkingOrient(cwd)).toContain("Dirty working tree may contain");
    execFileSync("git", ["add", "model.ts"], { cwd, stdio: "ignore" });
    execFileSync("git", ["commit", "-m", "record model progress"], {
      cwd,
      stdio: "ignore",
    });
    expect(chitkingOrient(cwd)).toContain(
      "Recent repository commits are not listed in recorded_commits.",
    );
  });

  it("record appends factual output and can add resolved commits", () => {
    const cwd = makeTempDir("chitking-record-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", {}, cwd);
    execFileSync("git", ["init"], { cwd, stdio: "ignore" });
    execFileSync("git", ["config", "user.email", "test@example.com"], {
      cwd,
      stdio: "ignore",
    });
    execFileSync("git", ["config", "user.name", "Test User"], {
      cwd,
      stdio: "ignore",
    });
    execFileSync("git", ["add", "."], { cwd, stdio: "ignore" });
    execFileSync("git", ["commit", "-m", "seed research thread"], {
      cwd,
      stdio: "ignore",
    });
    const head = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd,
      encoding: "utf-8",
    }).trim();

    chitkingRecord(
      {
        type: "evidence",
        commit: "HEAD",
        text: "Verification passed on fixture A.",
      },
      cwd,
    );

    const threadPath = path.join(
      cwd,
      "research",
      "contact-stability",
      "thread.md",
    );
    expect(readText(threadPath)).toContain("Verification passed on fixture A.");
    expect(readFrontmatter(threadPath).recorded_commits).toEqual([head]);
  });

  it("pack is no longer a registered command", () => {
    const program = createChitkingProgram();
    program.exitOverride();
    program.configureOutput({
      writeErr: () => undefined,
      writeOut: () => undefined,
    });

    expect(() =>
      program.parse(["pack", "--role", "plan"], { from: "user" }),
    ).toThrow();
  });

  it("auto-dispatches all role packets after new and prints a summary", () => {
    const cwd = makeTempDir("chitking-auto-dispatch-new-");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);

    chitkingNew("Contact Stability", {}, cwd);

    expect(logSpy).toHaveBeenCalledWith(
      "Dispatched 7 role packets for contact-stability.",
    );
    for (const role of [
      "build",
      "dreamer",
      "oracle",
      "plan",
      "review",
      "synthesize",
      "verify",
    ]) {
      expect(
        existsSync(
          path.join(
            cwd,
            "research",
            "contact-stability",
            "context",
            `${role}.yaml`,
          ),
        ),
      ).toBe(true);
    }
  });

  it("auto-dispatches all role packets after focus", () => {
    const cwd = makeTempDir("chitking-auto-dispatch-focus-");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", { noDispatch: true }, cwd);
    chitkingNew("Friction Model", { noDispatch: true }, cwd);

    chitkingFocus("contact-stability", {}, cwd);

    expect(logSpy).toHaveBeenCalledWith(
      "Dispatched 7 role packets for contact-stability.",
    );
    expect(
      existsSync(
        path.join(
          cwd,
          "research",
          "contact-stability",
          "context",
          "build.yaml",
        ),
      ),
    ).toBe(true);
  });

  it("auto-dispatches all role packets after step", () => {
    const cwd = makeTempDir("chitking-auto-dispatch-step-");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", { noDispatch: true }, cwd);

    chitkingStep({}, cwd);

    expect(logSpy).toHaveBeenCalledWith(
      "Dispatched 7 role packets for contact-stability.",
    );
    expect(
      existsSync(
        path.join(
          cwd,
          "research",
          "contact-stability",
          "context",
          "build.yaml",
        ),
      ),
    ).toBe(true);
  });

  it("init skips dispatch silently when no active thread exists", () => {
    const cwd = makeTempDir("chitking-init-no-dispatch-");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    chitkingInit(cwd);

    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Dispatched"),
    );
    expect(logSpy).toHaveBeenCalledWith("Chitking initialized.");
  });

  it("init auto-dispatches when an active thread already exists", () => {
    const cwd = makeTempDir("chitking-init-rerun-");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", { noDispatch: true }, cwd);

    chitkingInit(cwd);

    expect(logSpy).toHaveBeenCalledWith(
      "Dispatched 7 role packets for contact-stability.",
    );
  });

  it("--no-dispatch on init skips auto-dispatch when an active thread exists", () => {
    const cwd = makeTempDir("chitking-no-dispatch-init-");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", { noDispatch: true }, cwd);

    chitkingInit(cwd, { noDispatch: true });

    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Dispatched"),
    );
    expect(
      existsSync(
        path.join(
          cwd,
          "research",
          "contact-stability",
          "context",
          "build.yaml",
        ),
      ),
    ).toBe(false);
  });

  it("--no-dispatch on new skips auto-dispatch", () => {
    const cwd = makeTempDir("chitking-no-dispatch-new-");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);

    chitkingNew("Contact Stability", { noDispatch: true }, cwd);

    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Dispatched"),
    );
    expect(
      existsSync(
        path.join(
          cwd,
          "research",
          "contact-stability",
          "context",
          "build.yaml",
        ),
      ),
    ).toBe(false);
  });

  it("--no-dispatch on focus skips auto-dispatch", () => {
    const cwd = makeTempDir("chitking-no-dispatch-focus-");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", { noDispatch: true }, cwd);

    chitkingFocus("contact-stability", { noDispatch: true }, cwd);

    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Dispatched"),
    );
    expect(
      existsSync(
        path.join(
          cwd,
          "research",
          "contact-stability",
          "context",
          "build.yaml",
        ),
      ),
    ).toBe(false);
  });

  it("--no-dispatch on step skips auto-dispatch", () => {
    const cwd = makeTempDir("chitking-no-dispatch-step-");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", { noDispatch: true }, cwd);

    chitkingStep({ noDispatch: true }, cwd);

    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Dispatched"),
    );
    expect(
      existsSync(
        path.join(
          cwd,
          "research",
          "contact-stability",
          "context",
          "build.yaml",
        ),
      ),
    ).toBe(false);
  });

  it("assess prints pass/fail stage and maturity criteria for the active thread", () => {
    const cwd = makeTempDir("chitking-assess-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", { noDispatch: true }, cwd);
    const threadPath = path.join(
      cwd,
      "research",
      "contact-stability",
      "thread.md",
    );
    const threadText = readText(threadPath);
    writeFileSync(
      threadPath,
      threadText.replace(
        "## Theory Brief\n",
        "## Theory Brief\n\nA comprehensive theory brief that explains the core contact stability hypothesis with enough detail to evaluate the thread as it develops further.\n",
      ),
      "utf-8",
    );

    const output = chitkingAssess(undefined, cwd);

    expect(output).toContain("Assessment for thread: contact-stability");
    expect(output).toContain("Stage: seed");
    expect(output).toContain(
      "Stage advancement criteria (to advance from seed):",
    );
    expect(output).toContain("✓ Theory Brief: non-empty");
    expect(output).toContain("✗ Current Claim: empty (0 words)");
    expect(output).toContain(
      "→ Readiness to advance: 1/2 criteria met — not ready to step",
    );
    expect(output).toContain("Maturity criteria (for next level: developing):");
    expect(output).toContain("✓ Theory Brief: ≥20 words (");
    expect(output).toContain("✗ Current Claim: empty (0 words)");
    expect(output).toContain("Fill Current Claim to advance readiness.");
  });

  it("assess recommends step when all stage criteria pass", () => {
    const cwd = makeTempDir("chitking-assess-ready-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", { noDispatch: true }, cwd);
    const threadPath = path.join(
      cwd,
      "research",
      "contact-stability",
      "thread.md",
    );
    const threadText = readText(threadPath);
    writeFileSync(
      threadPath,
      threadText
        .replace(
          "## Theory Brief\n",
          "## Theory Brief\n\nA clear theory brief with enough words.\n",
        )
        .replace(
          "## Current Claim\n",
          "## Current Claim\n\nThe current claim under investigation.\n",
        ),
      "utf-8",
    );

    const output = chitkingAssess(undefined, cwd);

    expect(output).toContain(
      "→ Readiness to advance: 2/2 criteria met — ready to step",
    );
    expect(output).toContain("chitking step --to briefed --reason");
  });

  it("assess works on a non-active thread", () => {
    const cwd = makeTempDir("chitking-assess-named-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", { noDispatch: true }, cwd);
    chitkingNew("Friction Model", { noDispatch: true }, cwd);

    const output = chitkingAssess("contact-stability", cwd);

    expect(output).toContain("Assessment for thread: contact-stability");
  });

  it("assess errors when there is no active thread and no thread arg", () => {
    const cwd = makeTempDir("chitking-assess-no-active-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);

    expect(() => chitkingAssess(undefined, cwd)).toThrow(
      "No active Chitking thread",
    );
  });

  it("assess errors on unknown check type in config", () => {
    const cwd = makeTempDir("chitking-assess-bad-check-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", { noDispatch: true }, cwd);
    writeFileSync(
      path.join(cwd, ".chitking", "config.yaml"),
      `schema_version: 1
stages:
  - seed
stage_advancement:
  seed: 1
maturity_levels:
  - nascent
stage_criteria:
  seed:
    - { section: "Theory Brief", check: unknown-check }
maturity_criteria: {}
roles: {}
project_incomplete_markers: []
`,
      "utf-8",
    );

    expect(() => chitkingAssess("contact-stability", cwd)).toThrow(
      "Unknown assess check type: unknown-check",
    );
  });

  it("assess handles missing criteria config gracefully", () => {
    const cwd = makeTempDir("chitking-assess-missing-criteria-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", { noDispatch: true }, cwd);
    writeFileSync(
      path.join(cwd, ".chitking", "config.yaml"),
      `schema_version: 1
stages:
  - seed
stage_advancement:
  seed: 1
maturity_levels:
  - nascent
  - developing
stage_criteria: {}
maturity_criteria: {}
roles: {}
project_incomplete_markers: []
`,
      "utf-8",
    );

    const output = chitkingAssess("contact-stability", cwd);

    expect(output).toContain("No criteria configured for stage seed.");
    expect(output).toContain("No criteria configured for maturity developing.");
  });

  it("assess is read-only and does not modify thread or active state", () => {
    const cwd = makeTempDir("chitking-assess-readonly-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", { noDispatch: true }, cwd);
    const threadPath = path.join(
      cwd,
      "research",
      "contact-stability",
      "thread.md",
    );
    const activePath = path.join(cwd, ".chitking", "active.yaml");
    const threadBefore = readText(threadPath);
    const activeBefore = readText(activePath);

    chitkingAssess(undefined, cwd);

    expect(readText(threadPath)).toBe(threadBefore);
    expect(readText(activePath)).toBe(activeBefore);
  });

  it("iterate archives the active thread, creates a successor with predecessor, and focuses it", () => {
    const cwd = makeTempDir("chitking-iterate-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", { noDispatch: true }, cwd);

    const newSlug = chitkingIterate(
      "Friction Model",
      { noDispatch: true },
      cwd,
    );

    expect(newSlug).toBe("friction-model");
    expect(
      readFrontmatter(
        path.join(cwd, "research", "contact-stability", "thread.md"),
      ).archived,
    ).toBe(true);
    const newFrontmatter = readFrontmatter(
      path.join(cwd, "research", "friction-model", "thread.md"),
    );
    expect(newFrontmatter).toMatchObject({
      thread: "friction-model",
      title: "Friction Model",
      stage: "seed",
      maturity: "nascent",
      readiness: 1,
      predecessor: "contact-stability",
    });
    expect(
      readText(path.join(cwd, "research", "friction-model", "thread.md")),
    ).toContain("Iterated from contact-stability (archived).");
    expect(readText(path.join(cwd, ".chitking", "active.yaml"))).toContain(
      "active_thread: friction-model",
    );
    expect(chitkingList(cwd)).not.toContain("contact-stability");
  });

  it("iterate --slug option overrides generated slug", () => {
    const cwd = makeTempDir("chitking-iterate-slug-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", { noDispatch: true }, cwd);

    const newSlug = chitkingIterate(
      "Friction Model",
      { slug: "friction", noDispatch: true },
      cwd,
    );

    expect(newSlug).toBe("friction");
    expect(
      existsSync(path.join(cwd, "research", "friction", "thread.md")),
    ).toBe(true);
    expect(
      readFrontmatter(path.join(cwd, "research", "friction", "thread.md"))
        .predecessor,
    ).toBe("contact-stability");
  });

  it("iterate auto-dispatches all role packets for the new thread", () => {
    const cwd = makeTempDir("chitking-iterate-auto-dispatch-");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", { noDispatch: true }, cwd);

    chitkingIterate("Friction Model", {}, cwd);

    expect(logSpy).toHaveBeenCalledWith(
      "Dispatched 7 role packets for friction-model.",
    );
    for (const role of [
      "build",
      "dreamer",
      "oracle",
      "plan",
      "review",
      "synthesize",
      "verify",
    ]) {
      expect(
        existsSync(
          path.join(
            cwd,
            "research",
            "friction-model",
            "context",
            `${role}.yaml`,
          ),
        ),
      ).toBe(true);
    }
  });

  it("iterate --no-dispatch skips auto-dispatch", () => {
    const cwd = makeTempDir("chitking-iterate-no-dispatch-");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);
    chitkingNew("Contact Stability", { noDispatch: true }, cwd);

    chitkingIterate("Friction Model", { noDispatch: true }, cwd);

    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Dispatched"),
    );
    expect(
      existsSync(
        path.join(cwd, "research", "friction-model", "context", "build.yaml"),
      ),
    ).toBe(false);
  });

  it("iterate errors when there is no active thread", () => {
    const cwd = makeTempDir("chitking-iterate-no-active-");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd);

    expect(() =>
      chitkingIterate("Friction Model", { noDispatch: true }, cwd),
    ).toThrow("No active Chitking thread");
  });

  it("CLI --no-dispatch flag skips auto-dispatch through the option-parsing layer", () => {
    const cwd = makeTempDir("chitking-cli-no-dispatch-");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd, { noDispatch: true });
    const originalCwd = process.cwd();
    process.chdir(cwd);
    try {
      const program = createChitkingProgram();
      program.parse(["new", "Contact Stability", "--no-dispatch"], {
        from: "user",
      });

      expect(logSpy).toHaveBeenCalledWith(
        "Created and focused research thread: contact-stability",
      );
      expect(logSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("Dispatched"),
      );
      expect(
        existsSync(
          path.join(
            cwd,
            "research",
            "contact-stability",
            "context",
            "build.yaml",
          ),
        ),
      ).toBe(false);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it("CLI iterate --no-dispatch flag skips auto-dispatch through the option-parsing layer", () => {
    const cwd = makeTempDir("chitking-cli-iterate-no-dispatch-");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    chitkingInit(cwd, { noDispatch: true });
    chitkingNew("Contact Stability", { noDispatch: true }, cwd);
    const originalCwd = process.cwd();
    process.chdir(cwd);
    try {
      const program = createChitkingProgram();
      program.parse(["iterate", "Friction Model", "--no-dispatch"], {
        from: "user",
      });

      expect(logSpy).toHaveBeenCalledWith(
        "Iterated: contact-stability → friction-model",
      );
      expect(logSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("Dispatched"),
      );
      expect(
        existsSync(
          path.join(cwd, "research", "friction-model", "context", "build.yaml"),
        ),
      ).toBe(false);
    } finally {
      process.chdir(originalCwd);
    }
  });
});
