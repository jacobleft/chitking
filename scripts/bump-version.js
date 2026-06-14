#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

const packageJsonPath = path.join(targetDir, "package.json");
const constantsPath = path.join(targetDir, "src", "constants.ts");

const pkgRaw = readFileSync(packageJsonPath, "utf-8");
const pkg = JSON.parse(pkgRaw);
const oldVersion = pkg.version;

const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(oldVersion);
if (!match) {
  throw new Error(`Invalid version: "${oldVersion}"`);
}

const major = match[1];
const minor = match[2];
const patch = Number(match[3]) + 1;
const newVersion = `${major}.${minor}.${patch}`;

pkg.version = newVersion;
writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + "\n");

const constantsRaw = readFileSync(constantsPath, "utf-8");
const updatedConstants = constantsRaw.replace(
  /export const VERSION = "[^"]*";/,
  `export const VERSION = "${newVersion}";`,
);
writeFileSync(constantsPath, updatedConstants);

console.log(`Bumped version: ${oldVersion} → ${newVersion}`);
