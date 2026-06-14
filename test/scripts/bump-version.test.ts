import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const scriptPath = path.resolve("scripts", "bump-version.js");
const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
  const tempDir = mkdtempSync(path.join(tmpdir(), prefix));
  tempDirs.push(tempDir);
  return tempDir;
}

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

describe("bump-version script", () => {
  it("increments patch version in package.json and src/constants.ts", () => {
    const cwd = makeTempDir("bump-version-");
    mkdirSync(path.join(cwd, "src"));

    writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({ name: "test", version: "1.2.3" }, null, 2) + "\n",
    );
    writeFileSync(
      path.join(cwd, "src", "constants.ts"),
      'export const VERSION = "1.2.3";\n',
    );

    const output = execFileSync("node", [scriptPath, cwd], {
      encoding: "utf-8",
    }).trim();

    expect(output).toBe("Bumped version: 1.2.3 → 1.2.4");

    const pkg = JSON.parse(
      readFileSync(path.join(cwd, "package.json"), "utf-8"),
    );
    expect(pkg.version).toBe("1.2.4");

    const constants = readFileSync(
      path.join(cwd, "src", "constants.ts"),
      "utf-8",
    );
    expect(constants).toContain('export const VERSION = "1.2.4";');
  });

  it("bumps from 0.0.0 to 0.0.1", () => {
    const cwd = makeTempDir("bump-version-");
    mkdirSync(path.join(cwd, "src"));

    writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({ name: "test", version: "0.0.0" }, null, 2) + "\n",
    );
    writeFileSync(
      path.join(cwd, "src", "constants.ts"),
      'export const VERSION = "0.0.0";\n',
    );

    execFileSync("node", [scriptPath, cwd], { encoding: "utf-8" });

    const pkg = JSON.parse(
      readFileSync(path.join(cwd, "package.json"), "utf-8"),
    );
    expect(pkg.version).toBe("0.0.1");

    const constants = readFileSync(
      path.join(cwd, "src", "constants.ts"),
      "utf-8",
    );
    expect(constants).toContain('export const VERSION = "0.0.1";');
  });

  it("preserves package.json formatting (2-space indent, trailing newline)", () => {
    const cwd = makeTempDir("bump-version-");
    mkdirSync(path.join(cwd, "src"));

    const fixturePkg = {
      name: "test",
      version: "0.5.0",
      scripts: { build: "tsc" },
    };
    writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify(fixturePkg, null, 2) + "\n",
    );
    writeFileSync(
      path.join(cwd, "src", "constants.ts"),
      'export const VERSION = "0.5.0";\n',
    );

    execFileSync("node", [scriptPath, cwd], { encoding: "utf-8" });

    const raw = readFileSync(path.join(cwd, "package.json"), "utf-8");
    expect(raw.endsWith("\n")).toBe(true);
    expect(raw).toContain('  "version": "0.5.1",');
    // Ensure other keys are preserved
    expect(raw).toContain('"build": "tsc"');
  });
});
