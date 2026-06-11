import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { parse, stringify } from "yaml";
import {
  getOpenCodeTemplatePath,
  getChitkingRuntimeTemplatePath,
} from "../templates/extract.js";

const CHITKING_DIR = ".chitking";
const RESEARCH_DIR = "research";
const ACTIVE_FILE = "active.yaml";
const CONFIG_FILE = "config.yaml";
const PROJECT_FILE = "project.md";
const THREAD_FILE = "thread.md";
const CONTEXT_DIR = "context";
const CONTEXT_IGNORE_PATTERN = "research/*/context/*.yaml";
const ROLES_DIR = "roles";
const SKILLS_DIR = "skills";
const CHITKING_WORKFLOW_SKILL = "chitking-workflow";
const OPENCODE_DIR = ".opencode";
const OPENCODE_AGENTS_DIR = "agents";
const OPENCODE_SKILLS_DIR = "skills";
const OPENCODE_PLUGINS_DIR = "plugins";
const OPENCODE_CHITKING_CONTEXT_PLUGIN = "inject-chitking-context.js";
const CHITKING_CONFIG_TEMPLATE = "config.yaml";

export interface ChitkingStatus {
  productName: string;
  chineseName: string;
  behaviorMigrated: boolean;
  message: string;
}

export function getChitkingStatus(): ChitkingStatus {
  return {
    productName: "Chitking",
    chineseName: "哲徑",
    behaviorMigrated: true,
    message: "All Chitking scaffold and runtime command behavior is available.",
  };
}

export function formatChitkingStatus(
  status: ChitkingStatus = getChitkingStatus(),
): string {
  return `${status.productName} (${status.chineseName}): ${status.message}`;
}

const REQUIRED_THREAD_SECTIONS = [
  "Theory Brief",
  "Current Claim",
  "Capability Gap",
  "Verification Obligations",
  "Evidence",
  "Failed Paths",
  "Next Safe Actions",
  "Decisions & Maturity History",
] as const;

const RECORD_SECTION_BY_TYPE = {
  evidence: "Evidence",
  failure: "Failed Paths",
  decision: "Decisions & Maturity History",
  revision: "Current Claim",
} as const;

export type RecordType = keyof typeof RECORD_SECTION_BY_TYPE;

export interface NewThreadOptions {
  slug?: string;
}

export interface StepOptions {
  to?: string;
  readiness?: number;
  reason?: string;
}

export interface PackOptions {
  role: string;
}

export interface RecordOptions {
  type: RecordType;
  commit?: string;
  text: string;
}

interface RolePrompt {
  objective: string;
  stop_conditions: string[];
}

interface RoleDefinition {
  prompt: RolePrompt;
  min_maturity?: string;
  min_readiness?: number;
  warnings: string[];
}

interface OpenCodePermissions {
  read: "allow" | "deny";
  edit: "allow" | "deny";
  bash: "allow" | "deny";
  glob: "allow" | "deny";
  grep: "allow" | "deny";
  list: "allow" | "deny";
  task: "allow" | "deny";
}

interface ResearchConfig {
  schema_version: number;
  maturity_ladder: string[];
  readiness_thresholds: Record<string, number>;
  roles: Record<string, RoleDefinition>;
  project_incomplete_markers: string[];
}

interface ThreadFrontmatter {
  thread: string;
  title: string;
  maturity: string;
  readiness: number;
  readiness_source: string;
  recorded_commits: string[];
  updated_at: string;
}

interface ParsedThread {
  frontmatter: ThreadFrontmatter;
  body: string;
}

interface ActiveState {
  active_thread: string | null;
  updated_at: string;
}

interface GitSnapshot {
  dirty: string[];
  recentCommits: string[];
}

function nowIso(): string {
  return new Date().toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFileIfMissing(filePath: string, content: string): void {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, "utf-8");
  }
}

function readYamlRecord(filePath: string): Record<string, unknown> {
  const parsed = parse(fs.readFileSync(filePath, "utf-8")) as unknown;
  if (!isRecord(parsed)) {
    throw new Error(`${filePath} must contain a YAML mapping`);
  }
  return parsed;
}

function writeYamlFile(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, stringify(value), "utf-8");
}

function getChitkingDir(cwd: string): string {
  return path.join(cwd, CHITKING_DIR);
}

function getResearchDir(cwd: string): string {
  return path.join(cwd, RESEARCH_DIR);
}

function getProjectPath(cwd: string): string {
  return path.join(getResearchDir(cwd), PROJECT_FILE);
}

function getActivePath(cwd: string): string {
  return path.join(getChitkingDir(cwd), ACTIVE_FILE);
}

function getConfigPath(cwd: string): string {
  return path.join(getChitkingDir(cwd), CONFIG_FILE);
}

function getRolesDir(cwd: string): string {
  return path.join(getChitkingDir(cwd), ROLES_DIR);
}

function getRoleContractPath(cwd: string, role: string): string {
  return path.join(getRolesDir(cwd), `${role}.md`);
}

function getChitkingSkillsDir(cwd: string): string {
  return path.join(getChitkingDir(cwd), SKILLS_DIR);
}

function getChitkingWorkflowSkillPath(cwd: string): string {
  return path.join(getChitkingSkillsDir(cwd), `${CHITKING_WORKFLOW_SKILL}.md`);
}

function getOpenCodeAgentsDir(cwd: string): string {
  return path.join(cwd, OPENCODE_DIR, OPENCODE_AGENTS_DIR);
}

function getOpenCodeSkillsDir(cwd: string): string {
  return path.join(cwd, OPENCODE_DIR, OPENCODE_SKILLS_DIR);
}

function getOpenCodePluginsDir(cwd: string): string {
  return path.join(cwd, OPENCODE_DIR, OPENCODE_PLUGINS_DIR);
}

function getOpenCodeChitkingContextPluginPath(cwd: string): string {
  return path.join(getOpenCodePluginsDir(cwd), OPENCODE_CHITKING_CONTEXT_PLUGIN);
}

function getOpenCodeChitkingWorkflowSkillDir(cwd: string): string {
  return path.join(getOpenCodeSkillsDir(cwd), CHITKING_WORKFLOW_SKILL);
}

function getOpenCodeChitkingWorkflowSkillPath(cwd: string): string {
  return path.join(getOpenCodeChitkingWorkflowSkillDir(cwd), "SKILL.md");
}

function getOpenCodeAdapterPath(cwd: string, role: string): string {
  return path.join(getOpenCodeAgentsDir(cwd), `chitking-${role}.md`);
}

function getThreadDir(cwd: string, slug: string): string {
  return path.join(getResearchDir(cwd), slug);
}

function getThreadPath(cwd: string, slug: string): string {
  return path.join(getThreadDir(cwd, slug), THREAD_FILE);
}

function getContextDir(cwd: string, slug: string): string {
  return path.join(getThreadDir(cwd, slug), CONTEXT_DIR);
}

function getContextPath(cwd: string, slug: string, role: string): string {
  return path.join(getContextDir(cwd, slug), `${role}.yaml`);
}

function toRepoPath(cwd: string, filePath: string): string {
  return path.relative(cwd, filePath).split(path.sep).join("/");
}

function statusLinePaths(statusLine: string): string[] {
  const pathPart = statusLine.slice(3).trim();
  return pathPart.split(" -> ").map((entry) => entry.trim());
}

function isGeneratedContextPath(repoPath: string): boolean {
  return /^research\/[^/]+\/context(?:\/.*)?$/.test(repoPath);
}

function isOrientHousekeepingStatus(statusLine: string): boolean {
  const paths = statusLinePaths(statusLine);
  return paths.every(
    (repoPath) =>
      repoPath === ".chitking/active.yaml" ||
      isGeneratedContextPath(repoPath),
  );
}

function getChitkingRuntimeTemplateFilePath(...segments: string[]): string {
  return path.join(getChitkingRuntimeTemplatePath(), ...segments);
}

function defaultConfigTemplateContent(): string {
  return fs.readFileSync(getChitkingRuntimeTemplateFilePath(CHITKING_CONFIG_TEMPLATE), "utf-8");
}

function normalizeConfig(
  raw: Record<string, unknown>,
  defaults: ResearchConfig | undefined,
): ResearchConfig {
  const maturity = Array.isArray(raw.maturity_ladder)
    ? raw.maturity_ladder.filter(
        (item): item is string => typeof item === "string",
      )
    : (defaults?.maturity_ladder ?? []);
  const thresholds = isRecord(raw.readiness_thresholds)
    ? Object.fromEntries(
        Object.entries(raw.readiness_thresholds).filter(
          (entry): entry is [string, number] => typeof entry[1] === "number",
        ),
      )
    : (defaults?.readiness_thresholds ?? {});
  const roles = isRecord(raw.roles)
    ? parseRoles(raw.roles, defaults?.roles ?? {})
    : (defaults?.roles ?? {});
  const markers = Array.isArray(raw.project_incomplete_markers)
    ? raw.project_incomplete_markers.filter(
        (item): item is string => typeof item === "string",
      )
    : (defaults?.project_incomplete_markers ?? []);

  return {
    schema_version:
      typeof raw.schema_version === "number"
        ? raw.schema_version
        : (defaults?.schema_version ?? 1),
    maturity_ladder:
      maturity.length > 0 ? maturity : (defaults?.maturity_ladder ?? []),
    readiness_thresholds: { ...defaults?.readiness_thresholds, ...thresholds },
    roles,
    project_incomplete_markers: markers,
  };
}

function defaultConfig(): ResearchConfig {
  const raw = parse(defaultConfigTemplateContent()) as unknown;
  if (!isRecord(raw)) {
    throw new Error("Chitking default config template must contain a YAML mapping");
  }
  return normalizeConfig(raw, undefined);
}

function roleTitle(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function defaultRoleContractContent(
  roleName: string,
  role: RoleDefinition,
): string {
  const warnings = role.warnings.map((warning) => `- ${warning}`).join("\n");
  const stopConditions = role.prompt.stop_conditions
    .map((condition) => `- ${condition}`)
    .join("\n");
  const gates = [
    role.min_maturity ? `- Minimum maturity: ${role.min_maturity}` : null,
    role.min_readiness !== undefined
      ? `- Minimum readiness: ${role.min_readiness}`
      : null,
  ].filter((line): line is string => line !== null);
  const gateText = gates.length > 0 ? gates.join("\n") : "- No stage gate.";

  return `# Chitking ${roleTitle(roleName)} Role\n\n## Objective\n\n${role.prompt.objective}\n\n## Scope and Gates\n\n${gateText}\n\n## Required Inputs\n\n- Read \`research/project.md\` before the active thread.\n- Read the active \`research/<thread>/thread.md\`.\n- Use the per-thread packet from \`chitking pack --role ${roleName}\` for current file references, maturity, readiness, warnings, and stop conditions.\n\n## Warnings\n\n${warnings}\n\n## Stop Conditions\n\n${stopConditions}\n\n## Universal Boundaries\n\n- Do not change maturity or readiness; humans own those checkpoints.\n- Do not treat generated packets as source of truth; project and thread Markdown files are canonical.\n- Record factual output with \`chitking record\` only when a human or calling workflow asks for it.\n`;
}

function dreamerRoleContractContent(role: RoleDefinition): string {
  const warnings = role.warnings.map((warning) => `- ${warning}`).join("\n");
  const stopConditions = role.prompt.stop_conditions
    .map((condition) => `- ${condition}`)
    .join("\n");

  return `# Chitking Dreamer Role\n\n## Objective\n\n${role.prompt.objective}\n\n## Required Inputs\n\n- Theory brief.\n- Open questions.\n- Constraints and non-goals.\n- Unresolved objections.\n- Failed paths.\n- The current per-thread packet from \`chitking pack --role dreamer\`.\n\n## Output Shape\n\nProduce bounded ideation candidates, not an implementation plan:\n\n- Hypotheses that may explain the current capability gap.\n- Strange analogies that could reveal hidden structure.\n- Candidate mechanisms worth investigating.\n- Edge cases and failure modes that stress the theory.\n- Possible theory directions that require review before adoption.\n\n## Hard Boundaries\n\n- Do not create implementation tasks.\n- Do not assign work to build, Executor, or any implementation role.\n- Do not hand Dreamer output directly to build or Executor.\n- Do not present ideation as approved next safe action.\n- Route candidates through human, oracle, or planner review before they can become implementation work.\n\n## Warnings\n\n${warnings}\n\n## Stop Conditions\n\n${stopConditions}\n`;
}

function opencodePermissionsForRole(roleName: string): OpenCodePermissions {
  if (roleName === "build") {
    return {
      read: "allow",
      edit: "allow",
      bash: "allow",
      glob: "allow",
      grep: "allow",
      list: "allow",
      task: "deny",
    };
  }
  if (roleName === "verify") {
    return {
      read: "allow",
      edit: "deny",
      bash: "allow",
      glob: "allow",
      grep: "allow",
      list: "allow",
      task: "deny",
    };
  }
  return {
    read: "allow",
    edit: "deny",
    bash: "deny",
    glob: "allow",
    grep: "allow",
    list: "allow",
    task: "deny",
  };
}

function opencodeAdapterContent(
  roleName: string,
  role: RoleDefinition,
  contractContent: string,
): string {
  const permission = opencodePermissionsForRole(roleName);
  const dreamerBoundary =
    roleName === "dreamer"
      ? "\nDreamer-specific boundary: OpenCode `edit: deny` blocks write/edit/patch tools. Do not create implementation tasks, call build/Executor directly, or present ideation as approved implementation work.\n"
      : "";
  return `---\ndescription: |\n  Chitking ${roleTitle(roleName)} adapter with embedded canonical role contract.\nmode: subagent\npermission:\n  read: ${permission.read}\n  edit: ${permission.edit}\n  bash: ${permission.bash}\n  glob: ${permission.glob}\n  grep: ${permission.grep}\n  list: ${permission.list}\n  task: ${permission.task}\n---\n# Chitking ${roleTitle(roleName)} Adapter\n\nYou are the Chitking \`${roleName}\` role adapter for OpenCode.\n\nUse the active thread packet generated by:\n\n- \`chitking pack --role ${roleName}\`\n\nRole objective summary:\n\n${role.prompt.objective}\n${dreamerBoundary}\n## Embedded Canonical Role Contract\n\n${contractContent}`;
}

function chitkingWorkflowSkillContent(): string {
  return fs.readFileSync(
    getChitkingRuntimeTemplateFilePath(SKILLS_DIR, `${CHITKING_WORKFLOW_SKILL}.md`),
    "utf-8",
  );
}

function opencodeChitkingWorkflowSkillContent(canonicalContent: string): string {
  return `---
name: chitking-workflow
description: Trigger when working in a Chitking repo, using chitking commands, interpreting Chitking workflow/state files, or handling research threads, maturity, readiness, roles, or generated packets.
---
${canonicalContent}`;
}

function ensureOpenCodeChitkingContextPlugin(cwd: string): void {
  ensureDir(getOpenCodePluginsDir(cwd));
  const templatePath = path.join(
    getOpenCodeTemplatePath(),
    OPENCODE_PLUGINS_DIR,
    OPENCODE_CHITKING_CONTEXT_PLUGIN,
  );
  writeFileIfMissing(
    getOpenCodeChitkingContextPluginPath(cwd),
    fs.readFileSync(templatePath, "utf-8"),
  );
}

function ensureChitkingWorkflowSkill(cwd: string): void {
  ensureDir(getChitkingSkillsDir(cwd));
  ensureDir(getOpenCodeChitkingWorkflowSkillDir(cwd));
  const canonicalContent = chitkingWorkflowSkillContent();
  writeFileIfMissing(getChitkingWorkflowSkillPath(cwd), canonicalContent);
  writeFileIfMissing(
    getOpenCodeChitkingWorkflowSkillPath(cwd),
    opencodeChitkingWorkflowSkillContent(canonicalContent),
  );
}

function ensureRoleHarness(cwd: string, config: ResearchConfig): void {
  ensureDir(getRolesDir(cwd));
  ensureDir(getOpenCodeAgentsDir(cwd));
  for (const [roleName, role] of Object.entries(config.roles)) {
    const contractContent =
      roleName === "dreamer"
        ? dreamerRoleContractContent(role)
        : defaultRoleContractContent(roleName, role);
    writeFileIfMissing(getRoleContractPath(cwd, roleName), contractContent);
    writeFileIfMissing(
      getOpenCodeAdapterPath(cwd, roleName),
      opencodeAdapterContent(roleName, role, contractContent),
    );
  }
}

function defaultProjectContent(): string {
  return `# Research Project Context\n\n## Research Domain\nTODO: describe the domain this repository studies.\n\n## Core Theoretical Commitments\nTODO: list the commitments that should remain stable across threads.\n\n## Modeling Assumptions\nTODO: capture assumptions agents should not silently change.\n\n## Verification Standards\nTODO: define what counts as evidence.\n\n## Code/Experiment Norms\nTODO: describe repository-specific implementation and experiment norms.\n\n## Non-Goals\nTODO: list work this research harness should not pursue.\n`;
}

function defaultThreadBody(): string {
  return REQUIRED_THREAD_SECTIONS.map((section) => `## ${section}\n`).join(
    "\n",
  );
}

function loadConfig(cwd: string): ResearchConfig {
  const configPath = getConfigPath(cwd);
  if (!fs.existsSync(configPath)) {
    throw new Error("Run chitking init before using Chitking commands.");
  }

  const raw = readYamlRecord(configPath);
  const defaults = defaultConfig();
  return normalizeConfig(raw, defaults);
}

function parseRoles(
  rawRoles: Record<string, unknown>,
  fallback: Record<string, RoleDefinition>,
): Record<string, RoleDefinition> {
  const roles: Record<string, RoleDefinition> = { ...fallback };
  for (const [name, value] of Object.entries(rawRoles)) {
    if (!isRecord(value)) continue;
    const promptRaw = isRecord(value.prompt) ? value.prompt : {};
    const stopConditions = Array.isArray(promptRaw.stop_conditions)
      ? promptRaw.stop_conditions.filter(
          (item): item is string => typeof item === "string",
        )
      : [];
    const warnings = Array.isArray(value.warnings)
      ? value.warnings.filter(
          (item): item is string => typeof item === "string",
        )
      : [];
    roles[name] = {
      min_maturity:
        typeof value.min_maturity === "string" ? value.min_maturity : undefined,
      min_readiness:
        typeof value.min_readiness === "number"
          ? value.min_readiness
          : undefined,
      warnings,
      prompt: {
        objective:
          typeof promptRaw.objective === "string"
            ? promptRaw.objective
            : "Read project.md before thread.md and report factual findings.",
        stop_conditions: stopConditions,
      },
    };
  }
  return roles;
}

function parseActiveState(cwd: string): ActiveState {
  const activePath = getActivePath(cwd);
  if (!fs.existsSync(activePath)) {
    throw new Error(
      "No active Chitking thread. Run chitking thread new first.",
    );
  }
  const raw = readYamlRecord(activePath);
  return {
    active_thread:
      typeof raw.active_thread === "string" && raw.active_thread.length > 0
        ? raw.active_thread
        : null,
    updated_at: typeof raw.updated_at === "string" ? raw.updated_at : "",
  };
}

function writeActiveState(cwd: string, slug: string | null): void {
  writeYamlFile(getActivePath(cwd), {
    active_thread: slug,
    updated_at: nowIso(),
  });
}

function resolveActiveThread(cwd: string): string {
  const active = parseActiveState(cwd);
  if (!active.active_thread) {
    throw new Error(
      "No active Chitking thread. Run chitking focus <thread> first.",
    );
  }
  return active.active_thread;
}

function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) {
    throw new Error(
      "Thread title or slug must contain at least one alphanumeric character.",
    );
  }
  return slug;
}

function validateSlug(slug: string): string {
  const normalized = slugifyTitle(slug);
  if (normalized !== slug) {
    throw new Error(
      `Invalid slug "${slug}". Use lowercase letters, numbers, and hyphens.`,
    );
  }
  return normalized;
}

function parseThreadContent(content: string): ParsedThread {
  const normalized = content.replace(/\r\n/g, "\n");
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(normalized);
  if (!match) {
    throw new Error("thread.md must start with YAML frontmatter.");
  }
  const raw = parse(match[1]) as unknown;
  if (!isRecord(raw)) {
    throw new Error("thread.md frontmatter must be a YAML mapping.");
  }
  const recordedCommits = Array.isArray(raw.recorded_commits)
    ? raw.recorded_commits.filter(
        (item): item is string => typeof item === "string",
      )
    : [];
  const readiness =
    typeof raw.readiness === "number" ? raw.readiness : Number(raw.readiness);
  if (!Number.isInteger(readiness) || readiness < 0 || readiness > 5) {
    throw new Error("thread.md readiness must be an integer from 0 to 5.");
  }
  const thread = stringField(raw, "thread");
  const title = stringField(raw, "title");
  const maturity = stringField(raw, "maturity");
  const readinessSource = stringField(raw, "readiness_source");
  const updatedAt = stringField(raw, "updated_at");
  return {
    frontmatter: {
      thread,
      title,
      maturity,
      readiness,
      readiness_source: readinessSource,
      recorded_commits: recordedCommits,
      updated_at: updatedAt,
    },
    body: match[2],
  };
}

function stringField(raw: Record<string, unknown>, field: string): string {
  const value = raw[field];
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  throw new Error(
    `thread.md frontmatter missing required string field: ${field}`,
  );
}

function formatThreadContent(thread: ParsedThread): string {
  return `---\n${stringify(thread.frontmatter).trimEnd()}\n---\n${thread.body}`;
}

function readThread(cwd: string, slug: string): ParsedThread {
  const threadPath = getThreadPath(cwd, slug);
  if (!fs.existsSync(threadPath)) {
    throw new Error(`Thread not found: ${slug}`);
  }
  return parseThreadContent(fs.readFileSync(threadPath, "utf-8"));
}

function writeThread(cwd: string, slug: string, thread: ParsedThread): void {
  fs.writeFileSync(
    getThreadPath(cwd, slug),
    formatThreadContent(thread),
    "utf-8",
  );
}

function ensureThreadSections(body: string): string[] {
  return REQUIRED_THREAD_SECTIONS.filter(
    (section) => !body.includes(`## ${section}`),
  );
}

function appendToSection(body: string, section: string, text: string): string {
  const heading = `## ${section}`;
  const headingIndex = body.indexOf(heading);
  const entry = `- ${nowIso()} — ${text.trim()}\n`;
  if (headingIndex === -1) {
    return `${body.trimEnd()}\n\n${heading}\n${entry}`;
  }

  const afterHeading = headingIndex + heading.length;
  const nextHeadingMatch = /\n## /g;
  nextHeadingMatch.lastIndex = afterHeading;
  const nextHeading = nextHeadingMatch.exec(body);
  const insertAt = nextHeading?.index ?? body.length;
  const before = body.slice(0, insertAt).trimEnd();
  const after = body.slice(insertAt);
  return `${before}\n${entry}${after}`;
}

function resolveCommit(cwd: string, ref: string): string | null {
  try {
    return execFileSync("git", ["rev-parse", ref], {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function readGitSnapshot(cwd: string): GitSnapshot {
  try {
    const dirtyOutput = execFileSync(
      "git",
      ["status", "--porcelain", "--untracked-files=all"],
      {
        cwd,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trimEnd();
    const commitsOutput = execFileSync(
      "git",
      ["log", "--format=%H", "-n", "5"],
      {
        cwd,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim();
    return {
      dirty: dirtyOutput
        ? dirtyOutput
            .split("\n")
            .filter((line) => !isOrientHousekeepingStatus(line))
        : [],
      recentCommits: commitsOutput ? commitsOutput.split("\n") : [],
    };
  } catch {
    return { dirty: [], recentCommits: [] };
  }
}

function roleRiskWarnings(
  role: RoleDefinition,
  config: ResearchConfig,
  thread: ThreadFrontmatter,
): string[] {
  const warnings: string[] = [...role.warnings];
  if (
    role.min_readiness !== undefined &&
    thread.readiness < role.min_readiness
  ) {
    warnings.push(
      `readiness ${thread.readiness} is below role minimum ${role.min_readiness}`,
    );
  }
  if (role.min_maturity) {
    const currentIndex = config.maturity_ladder.indexOf(thread.maturity);
    const requiredIndex = config.maturity_ladder.indexOf(role.min_maturity);
    if (
      requiredIndex !== -1 &&
      currentIndex !== -1 &&
      currentIndex < requiredIndex
    ) {
      warnings.push(
        `maturity ${thread.maturity} is before role minimum ${role.min_maturity}`,
      );
    }
  }
  return warnings;
}

function findStalePackets(
  cwd: string,
  slug: string,
  threadUpdatedAt: string,
): string[] {
  const contextDir = getContextDir(cwd, slug);
  if (!fs.existsSync(contextDir)) return [];

  return fs
    .readdirSync(contextDir)
    .filter((entry) => entry.endsWith(".yaml"))
    .filter((entry) => {
      const packetPath = path.join(contextDir, entry);
      try {
        const packet = readYamlRecord(packetPath);
        return packet.source_thread_updated_at !== threadUpdatedAt;
      } catch {
        return true;
      }
    });
}

function projectLooksIncomplete(
  projectContent: string,
  config: ResearchConfig,
): boolean {
  return config.project_incomplete_markers.some((marker) =>
    projectContent.includes(marker),
  );
}

function validateReadiness(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 5) {
    throw new Error("Readiness must be an integer from 0 to 5.");
  }
  return value;
}

export function chitkingInit(cwd: string = process.cwd()): void {
  const chitkingDir = getChitkingDir(cwd);
  const researchDir = getResearchDir(cwd);
  ensureDir(chitkingDir);
  ensureDir(researchDir);
  writeFileIfMissing(getConfigPath(cwd), defaultConfigTemplateContent());
  ensureRoleHarness(cwd, loadConfig(cwd));
  ensureChitkingWorkflowSkill(cwd);
  ensureOpenCodeChitkingContextPlugin(cwd);
  writeFileIfMissing(
    getActivePath(cwd),
    stringify({ active_thread: null, updated_at: nowIso() }),
  );
  writeFileIfMissing(getProjectPath(cwd), defaultProjectContent());

  const gitignorePath = path.join(cwd, ".gitignore");
  const existing = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, "utf-8")
    : "";
  const lines = existing.split(/\r?\n/).filter((line) => line.length > 0);
  if (!lines.includes(CONTEXT_IGNORE_PATTERN)) {
    const prefix = existing.length > 0 && !existing.endsWith("\n") ? "\n" : "";
    fs.writeFileSync(
      gitignorePath,
      `${existing}${prefix}${CONTEXT_IGNORE_PATTERN}\n`,
      "utf-8",
    );
  }
  console.log("Chitking initialized.");
}

export function chitkingThreadNew(
  title: string,
  options: NewThreadOptions = {},
  cwd: string = process.cwd(),
): string {
  if (!fs.existsSync(getProjectPath(cwd))) {
    throw new Error("research/project.md is required. Run chitking init first.");
  }
  loadConfig(cwd);
  const slug = options.slug ? validateSlug(options.slug) : slugifyTitle(title);
  const threadDir = getThreadDir(cwd, slug);
  const threadPath = getThreadPath(cwd, slug);
  if (fs.existsSync(threadPath)) {
    throw new Error(`Thread already exists: ${slug}`);
  }
  ensureDir(threadDir);
  ensureDir(getContextDir(cwd, slug));
  const thread: ParsedThread = {
    frontmatter: {
      thread: slug,
      title,
      maturity: "seed",
      readiness: 1,
      readiness_source: "human",
      recorded_commits: [],
      updated_at: nowIso(),
    },
    body: defaultThreadBody(),
  };
  writeThread(cwd, slug, thread);
  writeActiveState(cwd, slug);
  console.log(`Created and focused research thread: ${slug}`);
  return slug;
}

export function chitkingFocus(
  thread?: string,
  cwd: string = process.cwd(),
): string | null {
  if (!thread) {
    const active = parseActiveState(cwd);
    console.log(active.active_thread ?? "No active thread");
    return active.active_thread;
  }
  const slug = validateSlug(thread);
  if (!fs.existsSync(getThreadPath(cwd, slug))) {
    throw new Error(`Thread not found: ${slug}`);
  }
  writeActiveState(cwd, slug);
  console.log(`Active thread: ${slug}`);
  return slug;
}

export function chitkingOrient(cwd: string = process.cwd()): string {
  const config = loadConfig(cwd);
  const slug = resolveActiveThread(cwd);
  const thread = readThread(cwd, slug);
  const projectPath = getProjectPath(cwd);
  const projectContent = fs.existsSync(projectPath)
    ? fs.readFileSync(projectPath, "utf-8")
    : "";
  const missingSections = ensureThreadSections(thread.body);
  const stalePackets = findStalePackets(
    cwd,
    slug,
    thread.frontmatter.updated_at,
  );
  const git = readGitSnapshot(cwd);
  const unrecordedCommits = git.recentCommits.filter(
    (commit) => !thread.frontmatter.recorded_commits.includes(commit),
  );
  const riskyRoles = Object.entries(config.roles)
    .map(([roleName, role]) => ({
      roleName,
      warnings: roleRiskWarnings(role, config, thread.frontmatter),
    }))
    .filter((role) => role.warnings.length > 0);
  const currentIndex = config.maturity_ladder.indexOf(
    thread.frontmatter.maturity,
  );
  const nextMaturity =
    currentIndex >= 0 && currentIndex < config.maturity_ladder.length - 1
      ? config.maturity_ladder[currentIndex + 1]
      : null;

  const lines = [
    `Active thread: ${slug}`,
    `Maturity: ${thread.frontmatter.maturity}`,
    `Readiness: ${thread.frontmatter.readiness} (${thread.frontmatter.readiness_source})`,
    "",
    "Warnings / blockers:",
  ];

  if (!projectContent) lines.push("- research/project.md is missing or empty.");
  if (projectLooksIncomplete(projectContent, config)) {
    lines.push("- research/project.md appears incomplete.");
  }
  for (const section of missingSections) {
    lines.push(`- thread.md missing required section: ${section}`);
  }
  if (git.dirty.length > 0) {
    lines.push("- Dirty working tree may contain unrecorded thread progress.");
  }
  if (unrecordedCommits.length > 0) {
    lines.push(
      "- Recent repository commits are not listed in recorded_commits.",
    );
  }
  for (const packet of stalePackets) {
    lines.push(`- Generated context packet may be stale: ${packet}`);
  }
  if (lines[lines.length - 1] === "Warnings / blockers:") {
    lines.push("- None detected.");
  }

  lines.push("", "Allowed-but-risky roles:");
  if (riskyRoles.length === 0) {
    lines.push("- None detected.");
  } else {
    for (const role of riskyRoles) {
      lines.push(`- ${role.roleName}: ${role.warnings.join("; ")}`);
    }
  }

  lines.push("", "Recommended next safe actions:");
  if (nextMaturity) {
    lines.push(
      `- If the thread is ready, run: chitking step --to ${nextMaturity} --reason "..."`,
    );
  }
  lines.push(
    "- Edit research/project.md or thread.md directly before agent fan-out.",
  );
  lines.push("- Regenerate a role packet with: chitking pack --role <role>");
  lines.push("", "Recovery options if stuck:");
  lines.push(
    '- Record a failed path with: chitking record --type failure --text "..."',
  );
  lines.push(
    '- Move maturity backward with: chitking step --to <maturity> --reason "..."',
  );

  const output = lines.join("\n");
  console.log(output);
  return output;
}

export function chitkingStep(
  options: StepOptions = {},
  cwd: string = process.cwd(),
): void {
  const config = loadConfig(cwd);
  const slug = resolveActiveThread(cwd);
  const thread = readThread(cwd, slug);
  const maturityIndex = config.maturity_ladder.indexOf(
    thread.frontmatter.maturity,
  );
  if (maturityIndex === -1) {
    throw new Error(`Unknown current maturity: ${thread.frontmatter.maturity}`);
  }

  const readiness =
    options.readiness !== undefined
      ? validateReadiness(options.readiness)
      : thread.frontmatter.readiness;
  let targetMaturity = options.to;
  if (targetMaturity) {
    if (!options.reason || options.reason.trim().length === 0) {
      throw new Error("chitking step --to requires --reason.");
    }
    if (!config.maturity_ladder.includes(targetMaturity)) {
      throw new Error(`Unknown maturity: ${targetMaturity}`);
    }
  } else {
    if (maturityIndex >= config.maturity_ladder.length - 1) {
      throw new Error("Thread is already at the final maturity stage.");
    }
    targetMaturity = config.maturity_ladder[maturityIndex + 1];
    const threshold = config.readiness_thresholds[targetMaturity] ?? 0;
    if (readiness < threshold) {
      throw new Error(
        `Readiness ${readiness} is below threshold ${threshold} for ${targetMaturity}.`,
      );
    }
  }

  const previousMaturity = thread.frontmatter.maturity;
  const previousReadiness = thread.frontmatter.readiness;
  thread.frontmatter.maturity = targetMaturity;
  if (options.readiness !== undefined) {
    thread.frontmatter.readiness = readiness;
    thread.frontmatter.readiness_source = "human";
  }
  thread.frontmatter.updated_at = nowIso();
  const reason = options.reason ? ` Reason: ${options.reason.trim()}` : "";
  const readinessText =
    previousReadiness === thread.frontmatter.readiness
      ? `readiness ${thread.frontmatter.readiness}`
      : `readiness ${previousReadiness}→${thread.frontmatter.readiness}`;
  thread.body = appendToSection(
    thread.body,
    "Decisions & Maturity History",
    `maturity ${previousMaturity}→${targetMaturity}; ${readinessText}.${reason}`,
  );
  writeThread(cwd, slug, thread);
  console.log(`Updated ${slug}: ${previousMaturity} → ${targetMaturity}`);
}

export function chitkingPack(
  options: PackOptions,
  cwd: string = process.cwd(),
): string {
  const config = loadConfig(cwd);
  const slug = resolveActiveThread(cwd);
  const role = config.roles[options.role];
  if (!role) {
    throw new Error(`Unknown role: ${options.role}`);
  }
  const thread = readThread(cwd, slug);
  ensureDir(getContextDir(cwd, slug));
  const packetPath = getContextPath(cwd, slug, options.role);
  const packet = {
    role: options.role,
    thread: slug,
    project_file: toRepoPath(cwd, getProjectPath(cwd)),
    thread_file: toRepoPath(cwd, getThreadPath(cwd, slug)),
    maturity: thread.frontmatter.maturity,
    readiness: thread.frontmatter.readiness,
    created_at: nowIso(),
    source_thread_updated_at: thread.frontmatter.updated_at,
    warnings: roleRiskWarnings(role, config, thread.frontmatter),
    prompt: role.prompt,
    reading_order: ["project_file", "thread_file"],
    agent_utilities: {
      record_evidence: 'chitking record --type evidence --text "..."',
      record_failure: 'chitking record --type failure --text "..."',
      record_decision: 'chitking record --type decision --text "..."',
      record_revision: 'chitking record --type revision --text "..."',
    },
  };
  writeYamlFile(packetPath, packet);
  const repoPath = toRepoPath(cwd, packetPath);
  console.log(repoPath);
  return repoPath;
}

export function chitkingRecord(
  options: RecordOptions,
  cwd: string = process.cwd(),
): void {
  if (!Object.hasOwn(RECORD_SECTION_BY_TYPE, options.type)) {
    throw new Error(`Unknown record type: ${options.type}`);
  }
  if (!options.text || options.text.trim().length === 0) {
    throw new Error("chitking record requires --text.");
  }
  const slug = resolveActiveThread(cwd);
  const thread = readThread(cwd, slug);
  const section = RECORD_SECTION_BY_TYPE[options.type];
  thread.body = appendToSection(thread.body, section, options.text);
  if (options.commit) {
    const commit = resolveCommit(cwd, options.commit);
    if (!commit) {
      throw new Error(`Could not resolve commit ref: ${options.commit}`);
    }
    if (!thread.frontmatter.recorded_commits.includes(commit)) {
      thread.frontmatter.recorded_commits.push(commit);
    }
  }
  thread.frontmatter.updated_at = nowIso();
  writeThread(cwd, slug, thread);
  console.log(`Recorded ${options.type} for ${slug}.`);
}

export function parseRecordType(value: string): RecordType {
  if (Object.hasOwn(RECORD_SECTION_BY_TYPE, value)) {
    return value as RecordType;
  }
  throw new Error(`Unknown record type: ${value}`);
}
