import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const PLUGIN_PATH =
  "../../src/templates/opencode/plugins/inject-chitking-context.js";

async function loadPlugin(): Promise<
  typeof import("../../src/templates/opencode/plugins/inject-chitking-context.js")
> {
  vi.resetModules();
  return import(PLUGIN_PATH);
}

function createTempRepo(stage = "seed"): string {
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
  writeFileSync(path.join(dir, ".chitking", "config.yaml"), "");
  writeFileSync(
    path.join(dir, "research", "demo-thread", "thread.md"),
    `---\nthread: demo-thread\nstage: ${stage}\nmaturity: nascent\nreadiness: 10\nreadiness_source: human\n---\n\n# Demo thread\n`,
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

  it("includes the stage-specific directive on the first turn", async () => {
    const { buildActiveDirective } = await loadPlugin();
    const dir = createTempRepo("seed");

    const breadcrumb = buildActiveDirective(dir);

    expect(breadcrumb).toContain("Active Chitking thread: demo-thread");
    expect(breadcrumb).toContain("Stage: seed");
    expect(breadcrumb).toContain("hash-check first");
    expect(breadcrumb).not.toContain("changed since last turn");
    rmSync(dir, { recursive: true, force: true });
  });

  it("does not warn when files are unchanged on a second turn", async () => {
    const { buildActiveDirective } = await loadPlugin();
    const dir = createTempRepo("seed");

    buildActiveDirective(dir);
    const breadcrumb = buildActiveDirective(dir);

    expect(breadcrumb).not.toContain("changed since last turn");
    rmSync(dir, { recursive: true, force: true });
  });

  it("warns when active.yaml changes between turns", async () => {
    const { buildActiveDirective } = await loadPlugin();
    const dir = createTempRepo("seed");

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
    const dir = createTempRepo("seed");

    buildActiveDirective(dir);
    writeFileSync(
      path.join(dir, "research", "demo-thread", "thread.md"),
      `---\nthread: demo-thread\nstage: seed\nmaturity: nascent\nreadiness: 20\nreadiness_source: human\n---\n\n# Updated thread\n`,
    );
    const breadcrumb = buildActiveDirective(dir);

    expect(breadcrumb).toContain(
      "⚠️ thread.md changed since last turn — re-read before acting.",
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it("warns when project.md changes between turns", async () => {
    const { buildActiveDirective } = await loadPlugin();
    const dir = createTempRepo("seed");

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

  it("suppresses the directive but keeps metadata and hash warnings when CHITKING_PROACTIVE=0", async () => {
    const { buildActiveDirective } = await loadPlugin();
    const dir = createTempRepo("briefed");

    buildActiveDirective(dir);
    process.env.CHITKING_PROACTIVE = "0";
    writeFileSync(
      path.join(dir, ".chitking", "active.yaml"),
      "active_thread: demo-thread\nupdated: true\n",
    );
    const breadcrumb = buildActiveDirective(dir);

    expect(breadcrumb).toContain("Active Chitking thread: demo-thread");
    expect(breadcrumb).toContain("Stage: briefed");
    expect(breadcrumb).not.toContain("Thread has a theory brief");
    expect(breadcrumb).toContain(
      "⚠️ active.yaml changed — active thread may differ from cached.",
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it("omits the directive for an unknown stage", async () => {
    const { buildActiveDirective } = await loadPlugin();
    const dir = createTempRepo("unknown-stage");

    const breadcrumb = buildActiveDirective(dir);

    expect(breadcrumb).toContain("Stage: unknown-stage");
    expect(breadcrumb).not.toContain("Thread is at seed stage");
    expect(breadcrumb).not.toContain("Thread has a theory brief");
    rmSync(dir, { recursive: true, force: true });
  });
});
