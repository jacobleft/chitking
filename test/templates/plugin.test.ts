import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const PLUGIN_PATH =
  "../../src/templates/opencode/plugins/inject-chitking-context.js";

const DEFAULT_CONFIG = `stages:
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
  briefed: 3
  gap-identified: 3
  specified: 3
  verification-planned: 3
  implementation-ready: 3
  evidence-recorded: 3
  synthesis-ready: 5
`;

async function loadPlugin(): Promise<
  typeof import("../../src/templates/opencode/plugins/inject-chitking-context.js")
> {
  vi.resetModules();
  return import(PLUGIN_PATH);
}

function createTempRepo(stage = "seed", readiness = 1): string {
  const dir = mkdtempSync(path.join(tmpdir(), "chitking-plugin-test-"));
  mkdirSync(path.join(dir, ".chitking"), { recursive: true });
  mkdirSync(path.join(dir, "research", "demo-thread"), { recursive: true });
  writeFileSync(
    path.join(dir, "research", "project.md"),
    "# Project\n\nDemo project.\n",
  );
  writeFileSync(
    path.join(dir, ".chitking", "active.yaml"),
    "active_thread: demo-thread\n",
  );
  writeFileSync(path.join(dir, ".chitking", "config.yaml"), DEFAULT_CONFIG);
  writeFileSync(
    path.join(dir, "research", "demo-thread", "thread.md"),
    `---\nthread: demo-thread\nstage: ${stage}\nmaturity: nascent\nreadiness: ${readiness}\nreadiness_source: human\n---\n\n# Demo thread\n`,
  );
  return dir;
}

describe("OpenCode plugin helpers", () => {
  describe("computeHash", () => {
    it("returns different hashes for different content", async () => {
      const { computeHash } = await loadPlugin();
      expect(computeHash("hello")).not.toBe(computeHash("world"));
    });

    it("returns the same hash for identical content", async () => {
      const { computeHash } = await loadPlugin();
      expect(computeHash("same")).toBe(computeHash("same"));
    });
  });

  describe("STAGE_DIRECTIVES", () => {
    it("contains a directive for every known stage", async () => {
      const { STAGE_DIRECTIVES } = await loadPlugin();
      for (const stage of [
        "seed",
        "briefed",
        "gap-identified",
        "specified",
        "verification-planned",
        "implementation-ready",
        "evidence-recorded",
        "synthesis-ready",
      ] as const) {
        expect(STAGE_DIRECTIVES[stage]).toBeTruthy();
      }
    });
  });
});

describe("buildActiveDirective", () => {
  const originalProactive = process.env.CHITKING_PROACTIVE;

  beforeEach(() => {
    delete process.env.CHITKING_PROACTIVE;
  });

  afterEach(() => {
    if (originalProactive === undefined) {
      delete process.env.CHITKING_PROACTIVE;
    } else {
      process.env.CHITKING_PROACTIVE = originalProactive;
    }
  });

  it("returns the missing-state breadcrumb when there is no active thread", async () => {
    const { buildActiveDirective } = await loadPlugin();
    const dir = mkdtempSync(path.join(tmpdir(), "chitking-plugin-missing-"));
    mkdirSync(path.join(dir, ".chitking"), { recursive: true });
    mkdirSync(path.join(dir, "research"), { recursive: true });
    writeFileSync(path.join(dir, "research", "project.md"), "# Project\n");
    writeFileSync(path.join(dir, ".chitking", "active.yaml"), "");

    const breadcrumb = buildActiveDirective(dir);

    expect(breadcrumb).toContain("<chitking-breadcrumb>");
    expect(breadcrumb).toContain("No active Chitking thread");
    expect(breadcrumb).toContain("</chitking-breadcrumb>");
    rmSync(dir, { recursive: true, force: true });
  });

  it("shows the session-start block on the first turn", async () => {
    const { buildActiveDirective } = await loadPlugin();
    const dir = createTempRepo("seed", 1);

    const breadcrumb = buildActiveDirective(dir);

    expect(breadcrumb).toContain("<chitking-session-start>");
    expect(breadcrumb).toContain("</chitking-session-start>");
    expect(breadcrumb).toContain("Chitking research workflow: threads advance through circular stages");
    expect(breadcrumb).toContain("Response style: when communicating about this thread");
    expect(breadcrumb).toContain("Thread: demo-thread");
    expect(breadcrumb).toContain("Stages: [seed] → briefed");
    expect(breadcrumb).toContain("→ (loop)");
    expect(breadcrumb).toContain(
      "Readiness: 1/5 — need ≥1 to advance to briefed ✓ ready",
    );
    expect(breadcrumb).toContain("Maturity: nascent (whole-thread quality)");
    expect(breadcrumb).toContain(
      "For full workflow docs: .opencode/skills/chitking-workflow/SKILL.md",
    );
    expect(breadcrumb).not.toContain("<chitking-breadcrumb>");
    expect(breadcrumb).not.toContain("Next:");
    expect(breadcrumb).not.toContain("changed since last turn");
    // Old flat metadata line is gone.
    expect(breadcrumb).not.toContain("Stage: seed | Maturity:");
    rmSync(dir, { recursive: true, force: true });
  });

  it("subsequent turns inject breadcrumb not session-start", async () => {
    const { buildActiveDirective } = await loadPlugin();
    const dir = createTempRepo("seed", 1);

    const first = buildActiveDirective(dir);
    const second = buildActiveDirective(dir);

    expect(first).toContain("<chitking-session-start>");
    expect(second).toContain("<chitking-breadcrumb>");
    expect(second).not.toContain("<chitking-session-start>");
    expect(second).toContain("Next: Thread is at seed stage");
    rmSync(dir, { recursive: true, force: true });
  });

  it("CHITKING_PROACTIVE=0 on first turn omits workflow overview", async () => {
    process.env.CHITKING_PROACTIVE = "0";
    const { buildActiveDirective } = await loadPlugin();
    const dir = createTempRepo("seed", 1);

    const breadcrumb = buildActiveDirective(dir);

    expect(breadcrumb).toContain("<chitking-session-start>");
    expect(breadcrumb).toContain("Thread: demo-thread");
    expect(breadcrumb).toContain("Maturity: nascent (whole-thread quality)");
    expect(breadcrumb).not.toContain(
      "Chitking research workflow: threads advance through circular stages",
    );
    expect(breadcrumb).not.toContain("Response style:");
    expect(breadcrumb).not.toContain(
      "For full workflow docs: .opencode/skills/chitking-workflow/SKILL.md",
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it("does not warn when files are unchanged on a second turn", async () => {
    const { buildActiveDirective } = await loadPlugin();
    const dir = createTempRepo("seed", 1);

    buildActiveDirective(dir);
    const breadcrumb = buildActiveDirective(dir);

    expect(breadcrumb).not.toContain("changed since last turn");
    rmSync(dir, { recursive: true, force: true });
  });

  it("warns when active.yaml changes between turns", async () => {
    const { buildActiveDirective } = await loadPlugin();
    const dir = createTempRepo("seed", 1);

    buildActiveDirective(dir);
    writeFileSync(
      path.join(dir, ".chitking", "active.yaml"),
      "active_thread: demo-thread\nupdated: true\n",
    );
    const breadcrumb = buildActiveDirective(dir);

    expect(breadcrumb).toContain(
      "⚠️ active.yaml changed — active thread may differ from cached.",
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it("warns when thread.md changes between turns", async () => {
    const { buildActiveDirective } = await loadPlugin();
    const dir = createTempRepo("seed", 1);

    buildActiveDirective(dir);
    writeFileSync(
      path.join(dir, "research", "demo-thread", "thread.md"),
      `---\nthread: demo-thread\nstage: seed\nmaturity: nascent\nreadiness: 2\nreadiness_source: human\n---\n\n# Updated thread\n`,
    );
    const breadcrumb = buildActiveDirective(dir);

    expect(breadcrumb).toContain(
      "⚠️ thread.md changed since last turn — re-read before acting.",
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it("warns when project.md changes between turns", async () => {
    const { buildActiveDirective } = await loadPlugin();
    const dir = createTempRepo("seed", 1);

    buildActiveDirective(dir);
    writeFileSync(
      path.join(dir, "research", "project.md"),
      "# Project\n\nUpdated project.\n",
    );
    const breadcrumb = buildActiveDirective(dir);

    expect(breadcrumb).toContain(
      "⚠️ project.md changed since last turn — re-read before acting.",
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it("suppresses the directive but keeps the whole picture when CHITKING_PROACTIVE=0", async () => {
    const { buildActiveDirective } = await loadPlugin();
    const dir = createTempRepo("briefed", 1);

    buildActiveDirective(dir);
    process.env.CHITKING_PROACTIVE = "0";
    writeFileSync(
      path.join(dir, ".chitking", "active.yaml"),
      "active_thread: demo-thread\nupdated: true\n",
    );
    const breadcrumb = buildActiveDirective(dir);

    expect(breadcrumb).toContain("Thread: demo-thread");
    expect(breadcrumb).toContain("Stages: seed → [briefed]");
    expect(breadcrumb).toContain("→ (loop)");
    expect(breadcrumb).toContain(
      "Readiness: 1/5 — need ≥3 to advance to gap-identified ✗ not ready",
    );
    expect(breadcrumb).toContain("Maturity: nascent (whole-thread quality)");
    expect(breadcrumb).not.toContain("Next:");
    expect(breadcrumb).not.toContain("Thread has a theory brief");
    expect(breadcrumb).toContain(
      "⚠️ active.yaml changed — active thread may differ from cached.",
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it("shows the loop-back readiness line at the final stage", async () => {
    const { buildActiveDirective } = await loadPlugin();
    const dir = createTempRepo("synthesis-ready", 5);

    const first = buildActiveDirective(dir);
    const breadcrumb = buildActiveDirective(dir);

    expect(first).toContain("[synthesis-ready]");
    expect(first).toContain(
      "Readiness: 5/5 — ready to loop back to seed ✓",
    );
    expect(breadcrumb).toContain("Next: Thread is ready for synthesis");
    rmSync(dir, { recursive: true, force: true });
  });

  it("omits the directive for an unknown stage", async () => {
    const { buildActiveDirective } = await loadPlugin();
    const dir = createTempRepo("unknown-stage", 1);

    const breadcrumb = buildActiveDirective(dir);

    expect(breadcrumb).toContain("Stages:");
    expect(breadcrumb).not.toContain("Next:");
    expect(breadcrumb).not.toContain("Thread is at seed stage");
    expect(breadcrumb).not.toContain("Thread has a theory brief");
    rmSync(dir, { recursive: true, force: true });
  });
});
