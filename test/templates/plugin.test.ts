import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Import the DEFAULT export only
import createHooks from "../../src/templates/opencode/plugins/inject-chitking-context.js";

// Helper: create a minimal chitking workspace in a temp dir
function setupTempWorkspace(): string {
  const cwd = mkdtempSync(join(tmpdir(), "chitking-plugin-test-"));
  mkdirSync(join(cwd, ".chitking"), { recursive: true });
  mkdirSync(join(cwd, "research"), { recursive: true });
  mkdirSync(join(cwd, "research", "test-thread"), { recursive: true });
  writeFileSync(
    join(cwd, ".chitking", "active.yaml"),
    "active_thread: test-thread\nupdated_at: 2026-01-01T00:00:00.000Z\n",
  );
  writeFileSync(
    join(cwd, ".chitking", "config.yaml"),
    `stages:
  - seed
  - briefed
  - gap-identified
  - specified
  - verification-planned
  - implementation-ready
  - evidence-recorded
  - synthesis-ready
stage_advancement:
  seed: 1
  briefed: 1
maturity_levels:
  - nascent
  - developing
  - established
  - mature
roles:
  plan:
    min_stage: briefed
    min_readiness: 1
stage_criteria: {}
maturity_criteria: {}
project_incomplete_markers:
  - TODO`,
  );
  writeFileSync(
    join(cwd, "research", "project.md"),
    "# Test Project\n\nThis is a test project.",
  );
  writeFileSync(
    join(cwd, "research", "test-thread", "thread.md"),
    "---\nthread: test-thread\ntitle: Test Thread\nstage: seed\nmaturity: nascent\nreadiness: 1\nreadiness_source: human\nrecorded_commits: []\nupdated_at: 2026-01-01T00:00:00.000Z\n---\n## Theory Brief\n\nTest theory.\n",
  );
  return cwd;
}

interface ChatHooks {
  "chat.message": (
    input: { sessionID?: string },
    output: { parts: { type: string; text: string }[] },
  ) => Promise<void>;
}

// Helper: call chat.message hook and return the injected text
async function callChatMessage(
  hooks: ChatHooks,
  directory: string,
  sessionID: string,
): Promise<string> {
  const output = { parts: [{ type: "text" as const, text: "user message" }] };
  await hooks["chat.message"]({ sessionID }, output);
  return output.parts[0]?.text || "";
}

describe("chitking plugin", () => {
  const tempDirs: string[] = [];

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("first turn emits session-start block with workflow overview", async () => {
    const cwd = setupTempWorkspace();
    tempDirs.push(cwd);
    const hooks = await createHooks({ directory: cwd });
    const text = await callChatMessage(hooks, cwd, "session-1");
    expect(text).toContain("<chitking-session-start>");
    expect(text).toContain("circular stages");
    expect(text).toContain("Response style");
    expect(text).toContain("[seed]");
    expect(text).toContain("→ (loop)");
  });

  it("subsequent turn emits breadcrumb not session-start", async () => {
    const cwd = setupTempWorkspace();
    tempDirs.push(cwd);
    const hooks = await createHooks({ directory: cwd });
    // First turn
    await callChatMessage(hooks, cwd, "session-2");
    // Second turn (same session)
    const text = await callChatMessage(hooks, cwd, "session-2");
    expect(text).toContain("<chitking-breadcrumb>");
    expect(text).not.toContain("<chitking-session-start>");
  });

  it("CHITKING_PROACTIVE=0 on first turn omits workflow overview", async () => {
    vi.stubEnv("CHITKING_PROACTIVE", "0");
    try {
      const cwd = setupTempWorkspace();
      tempDirs.push(cwd);
      const hooks = await createHooks({ directory: cwd });
      const text = await callChatMessage(hooks, cwd, "session-3");
      expect(text).toContain("<chitking-session-start>");
      expect(text).not.toContain("circular stages");
      expect(text).not.toContain("Response style");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("different sessions each get their own first turn", async () => {
    const cwd = setupTempWorkspace();
    tempDirs.push(cwd);
    const hooks = await createHooks({ directory: cwd });
    const text1 = await callChatMessage(hooks, cwd, "session-a");
    const text2 = await callChatMessage(hooks, cwd, "session-b");
    expect(text1).toContain("<chitking-session-start>");
    expect(text2).toContain("<chitking-session-start>");
  });

  it("breadcrumb shows stage progression and readiness context", async () => {
    const cwd = setupTempWorkspace();
    tempDirs.push(cwd);
    const hooks = await createHooks({ directory: cwd });
    await callChatMessage(hooks, cwd, "session-5"); // first turn
    const text = await callChatMessage(hooks, cwd, "session-5"); // second turn
    expect(text).toContain("[seed]");
    expect(text).toContain("→ (loop)");
    expect(text).toContain("/5");
    expect(text).toContain("ready");
    expect(text).toContain("Maturity:");
  });

  it("missing thread emits fallback breadcrumb", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "chitking-empty-"));
    tempDirs.push(cwd);
    mkdirSync(join(cwd, ".chitking"), { recursive: true });
    mkdirSync(join(cwd, "research"), { recursive: true });
    writeFileSync(join(cwd, "research", "project.md"), "# Empty");
    writeFileSync(
      join(cwd, ".chitking", "active.yaml"),
      "active_thread: null\nupdated_at: 2026-01-01T00:00:00.000Z\n",
    );
    mkdirSync(join(cwd, ".chitking", "roles"), { recursive: true });
    writeFileSync(
      join(cwd, ".chitking", "config.yaml"),
      "stages:\n  - seed\n  - briefed\nroles:\n  plan:\n    min_stage: seed\nstage_advancement:\n  seed: 1\nmaturity_levels:\n  - nascent\nstage_criteria: {}\nmaturity_criteria: {}\nproject_incomplete_markers:\n  - TODO",
    );
    const hooks = await createHooks({ directory: cwd });
    const text = await callChatMessage(hooks, cwd, "session-6");
    // Should still get some output, even with missing thread
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain("chitking");
  });
});
