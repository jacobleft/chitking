import fs from "node:fs";
import path from "node:path";
import { parse, stringify } from "yaml";
import { getChitkingRuntimeTemplatePath } from "../templates/extract.js";
import type { CkCommand } from "./types.js";

export const CHITKING_DIR = ".chitking";
export const RESEARCH_DIR = "research";
export const ACTIVE_FILE = "active.yaml";
export const CONFIG_FILE = "config.yaml";
export const PROJECT_FILE = "project.md";
export const THREAD_FILE = "thread.md";
export const CONTEXT_DIR = "context";
export const CONTEXT_IGNORE_PATTERN = "research/*/context/*.yaml";
export const ROLES_DIR = "roles";
export const SKILLS_DIR = "skills";
export const COMMANDS_DIR = "commands";
export const CHITKING_WORKFLOW_SKILL = "chitking-workflow";
export const OPENCODE_DIR = ".opencode";
export const OPENCODE_AGENTS_DIR = "agents";
export const OPENCODE_COMMANDS_DIR = "commands";
export const OPENCODE_SKILLS_DIR = "skills";
export const OPENCODE_PLUGINS_DIR = "plugins";
export const OPENCODE_CHITKING_CONTEXT_PLUGIN = "inject-chitking-context.js";
export const CODEX_DIR = ".codex";
export const CODEX_SKILLS_DIR = "skills";
export const CODEX_CONFIG_TEMPLATE = "config.toml";
export const CHITKING_CONFIG_TEMPLATE = "config.yaml";

export function nowIso(): string {
  return new Date().toISOString();
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function writeFileIfMissing(filePath: string, content: string): void {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, "utf-8");
  }
}

export function readYamlRecord(filePath: string): Record<string, unknown> {
  const parsed = parse(fs.readFileSync(filePath, "utf-8")) as unknown;
  if (!isRecord(parsed)) {
    throw new Error(`${filePath} must contain a YAML mapping`);
  }
  return parsed;
}

export function writeYamlFile(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, stringify(value), "utf-8");
}

export function getChitkingDir(cwd: string): string {
  return path.join(cwd, CHITKING_DIR);
}

export function getResearchDir(cwd: string): string {
  return path.join(cwd, RESEARCH_DIR);
}

export function getProjectPath(cwd: string): string {
  return path.join(getResearchDir(cwd), PROJECT_FILE);
}

export function getActivePath(cwd: string): string {
  return path.join(getChitkingDir(cwd), ACTIVE_FILE);
}

export function getConfigPath(cwd: string): string {
  return path.join(getChitkingDir(cwd), CONFIG_FILE);
}

export function getRolesDir(cwd: string): string {
  return path.join(getChitkingDir(cwd), ROLES_DIR);
}

export function getRoleContractPath(cwd: string, role: string): string {
  return path.join(getRolesDir(cwd), `${role}.md`);
}

export function getChitkingSkillsDir(cwd: string): string {
  return path.join(getChitkingDir(cwd), SKILLS_DIR);
}

export function getChitkingWorkflowSkillPath(cwd: string): string {
  return path.join(getChitkingSkillsDir(cwd), `${CHITKING_WORKFLOW_SKILL}.md`);
}

export function getOpenCodeAgentsDir(cwd: string): string {
  return path.join(cwd, OPENCODE_DIR, OPENCODE_AGENTS_DIR);
}

export function getOpenCodeCommandsDir(cwd: string): string {
  return path.join(cwd, OPENCODE_DIR, OPENCODE_COMMANDS_DIR);
}

export function getOpenCodeSkillsDir(cwd: string): string {
  return path.join(cwd, OPENCODE_DIR, OPENCODE_SKILLS_DIR);
}

export function getOpenCodePluginsDir(cwd: string): string {
  return path.join(cwd, OPENCODE_DIR, OPENCODE_PLUGINS_DIR);
}

export function getOpenCodeChitkingContextPluginPath(cwd: string): string {
  return path.join(
    getOpenCodePluginsDir(cwd),
    OPENCODE_CHITKING_CONTEXT_PLUGIN,
  );
}

export function getOpenCodeChitkingWorkflowSkillDir(cwd: string): string {
  return path.join(getOpenCodeSkillsDir(cwd), CHITKING_WORKFLOW_SKILL);
}

export function getOpenCodeChitkingWorkflowSkillPath(cwd: string): string {
  return path.join(getOpenCodeChitkingWorkflowSkillDir(cwd), "SKILL.md");
}

export function getOpenCodeAdapterPath(cwd: string, role: string): string {
  return path.join(getOpenCodeAgentsDir(cwd), `chitking-${role}.md`);
}

export function getOpenCodeCommandPath(
  cwd: string,
  command: CkCommand,
): string {
  return path.join(getOpenCodeCommandsDir(cwd), `${command}.md`);
}

export function getCodexSkillsDir(cwd: string): string {
  return path.join(cwd, CODEX_DIR, CODEX_SKILLS_DIR);
}

export function getCodexConfigPath(cwd: string): string {
  return path.join(cwd, CODEX_DIR, CODEX_CONFIG_TEMPLATE);
}

export function getCodexCommandSkillDir(
  cwd: string,
  command: CkCommand,
): string {
  return path.join(getCodexSkillsDir(cwd), command);
}

export function getCodexCommandSkillPath(
  cwd: string,
  command: CkCommand,
): string {
  return path.join(getCodexCommandSkillDir(cwd, command), "SKILL.md");
}

export function getThreadDir(cwd: string, slug: string): string {
  return path.join(getResearchDir(cwd), slug);
}

export function getThreadPath(cwd: string, slug: string): string {
  return path.join(getThreadDir(cwd, slug), THREAD_FILE);
}

export function getContextDir(cwd: string, slug: string): string {
  return path.join(getThreadDir(cwd, slug), CONTEXT_DIR);
}

export function getContextPath(
  cwd: string,
  slug: string,
  role: string,
): string {
  return path.join(getContextDir(cwd, slug), `${role}.yaml`);
}

export function toRepoPath(cwd: string, filePath: string): string {
  return path.relative(cwd, filePath).split(path.sep).join("/");
}

export function statusLinePaths(statusLine: string): string[] {
  const pathPart = statusLine.slice(3).trim();
  return pathPart.split(" -> ").map((entry) => entry.trim());
}

export function isGeneratedContextPath(repoPath: string): boolean {
  return /^research\/[^/]+\/context(?:\/.*)?$/.test(repoPath);
}

export function isOrientHousekeepingStatus(statusLine: string): boolean {
  const paths = statusLinePaths(statusLine);
  return paths.every(
    (repoPath) =>
      repoPath === ".chitking/active.yaml" || isGeneratedContextPath(repoPath),
  );
}

export function getChitkingRuntimeTemplateFilePath(
  ...segments: string[]
): string {
  return path.join(getChitkingRuntimeTemplatePath(), ...segments);
}
