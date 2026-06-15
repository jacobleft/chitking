import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parse } from "yaml";

import {
  chitkingAssess,
  chitkingInit,
  chitkingIterate,
  chitkingMature,
  chitkingNew,
  chitkingStep,
} from "../../src/index.js";

const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function readThreadText(cwd: string, slug: string): string {
  return readFileSync(path.join(cwd, "research", slug, "thread.md"), "utf-8");
}

function readFrontmatter(cwd: string, slug: string): Record<string, unknown> {
  const content = readThreadText(cwd, slug);
  const match = /^---\n([\s\S]*?)\n---/.exec(content);
  expect(match).not.toBeNull();
  return parse(match?.[1] ?? "") as Record<string, unknown>;
}

function fillSection(
  cwd: string,
  slug: string,
  section: string,
  content: string,
): void {
  const threadPath = path.join(cwd, "research", slug, "thread.md");
  let body = readFileSync(threadPath, "utf-8");
  body = body.replace(`## ${section}\n`, `## ${section}\n\n${content}\n`);
  writeFileSync(threadPath, body, "utf-8");
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const tempDir of tempDirs.splice(0)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

describe("end-to-end research lifecycle", () => {
  it("simulates full lifecycle: init → new → fill → assess → step → loop → mature → iterate", () => {
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.join(" "));
    });

    const cwd = makeTempDir("chitking-e2e-");

    // 1. Init
    chitkingInit(cwd);
    expect(logs).toContain("Chitking initialized.");

    // 2. New thread
    const slug = chitkingNew("Test Thread", {}, cwd);
    expect(slug).toBe("test-thread");
    let frontmatter = readFrontmatter(cwd, slug);
    expect(frontmatter).toMatchObject({
      thread: "test-thread",
      title: "Test Thread",
      stage: "seed",
      maturity: "nascent",
      readiness: 1,
    });

    // 3. Fill sections (simulate co-ownership writing)
    fillSection(
      cwd,
      slug,
      "Theory Brief",
      "Test theory about X being predictable from Y.",
    );
    fillSection(
      cwd,
      slug,
      "Current Claim",
      "X is a useful screening metric for outcome Z.",
    );

    // 4. Assess
    const assessOutput = chitkingAssess(undefined, cwd);
    expect(assessOutput).toContain("Stage advancement criteria");
    expect(assessOutput).toContain("✓ Theory Brief: non-empty");
    expect(assessOutput).toContain("✓ Current Claim: non-empty");
    expect(assessOutput).toContain(
      "→ Readiness to advance: 2/2 criteria met — ready to step",
    );

    // 5. Step through all stages
    const stages = [
      "briefed",
      "gap-identified",
      "specified",
      "verification-planned",
      "implementation-ready",
      "evidence-recorded",
      "synthesis-ready",
    ];
    for (let index = 0; index < stages.length; index++) {
      const stage = stages[index];
      const previousStage = index === 0 ? "seed" : stages[index - 1];
      chitkingStep({ to: stage, reason: `advance to ${stage}` }, cwd);
      frontmatter = readFrontmatter(cwd, slug);
      expect(frontmatter.stage).toBe(stage);
      expect(frontmatter.readiness).toBe(1);
      expect(
        logs.some((line) =>
          line.includes(`Updated ${slug}: ${previousStage} → ${stage}`),
        ),
      ).toBe(true);
    }

    // 6. Loop-back step (synthesis-ready → seed)
    chitkingStep({ noDispatch: true }, cwd);
    frontmatter = readFrontmatter(cwd, slug);
    expect(frontmatter.stage).toBe("seed");
    expect(frontmatter.readiness).toBe(1);
    expect(readThreadText(cwd, slug)).toContain(
      "cycle complete; looped synthesis-ready→seed",
    );

    // 7. Mature
    chitkingMature({ to: "developing", reason: "one cycle complete" }, cwd);
    frontmatter = readFrontmatter(cwd, slug);
    expect(frontmatter.maturity).toBe("developing");
    expect(frontmatter.stage).toBe("seed");
    expect(readThreadText(cwd, slug)).toContain(
      "maturity nascent→developing. Reason: one cycle complete",
    );
    expect(logs).toContain(`Maturity updated: ${slug} nascent → developing`);

    // 8. Iterate
    const newSlug = chitkingIterate(
      "Test Thread v2",
      { noDispatch: true },
      cwd,
    );
    expect(newSlug).toBe("test-thread-v2");
    expect(newSlug).not.toBe(slug);
    expect(logs).toContain(`Iterated: ${slug} → ${newSlug}`);

    // 9. Verify predecessor + archived
    const newFrontmatter = readFrontmatter(cwd, newSlug);
    expect(newFrontmatter.predecessor).toBe(slug);
    const oldFrontmatter = readFrontmatter(cwd, slug);
    expect(oldFrontmatter.archived).toBe(true);

    // 10. Verify auto-dispatch fired where expected (default dispatch after step/mature/iterate)
    expect(
      logs.filter((line) => line.startsWith("Dispatched ")).length,
    ).toBeGreaterThanOrEqual(1);

    // 11. Verify context packets exist for the latest active thread
    expect(existsSync(path.join(cwd, "research", newSlug, "context"))).toBe(
      true,
    );

    // 12. Summary of recorded lifecycle outputs for inspection
    const lifecycleSummary = logs
      .filter(
        (line) =>
          line.includes("Chitking initialized") ||
          line.includes("Created and focused research thread") ||
          line.includes("Assessment for thread") ||
          line.startsWith("Updated ") ||
          line.includes("cycle complete") ||
          line.startsWith("Maturity updated") ||
          line.startsWith("Iterated") ||
          line.startsWith("Dispatched "),
      )
      .join("\n");
    expect(lifecycleSummary).toContain(
      "Created and focused research thread: test-thread",
    );
    expect(lifecycleSummary).toContain("Assessment for thread: test-thread");
    expect(lifecycleSummary).toContain("Updated test-thread: synthesis-ready");
    expect(lifecycleSummary).toContain(
      "Maturity updated: test-thread nascent → developing",
    );
    expect(lifecycleSummary).toContain(
      "Iterated: test-thread → test-thread-v2",
    );
  });
});
