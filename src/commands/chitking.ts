import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { parse, stringify } from "yaml";
import {
  getCodexTemplatePath,
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
const COMMANDS_DIR = "commands";
const CHITKING_WORKFLOW_SKILL = "chitking-workflow";
const CK_COMMANDS = [
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
  "ck-dispatch",
  "ck-record",
  "ck-assess",
  "ck-iterate",
] as const;
type CkCommand = (typeof CK_COMMANDS)[number];
const CK_COMMAND_DESCRIPTIONS: Record<CkCommand, string> = {
  "ck-init":
    "Initialize Chitking scaffold and generated adapters without overwriting existing generated files.",
  "ck-new":
    "Create and focus a Chitking research thread from a title while preserving human-owned stage/readiness boundaries.",
  "ck-list": "List non-archived Chitking research threads.",
  "ck-show":
    "Show a Chitking research thread summary and source-of-truth paths.",
  "ck-focus":
    "Set the active Chitking research thread by slug and confirm source-of-truth paths.",
  "ck-rename":
    "Rename a Chitking research thread title while preserving the stable slug.",
  "ck-archive":
    "Archive a Chitking research thread only after explicit user confirmation.",
  "ck-restore": "Restore an archived Chitking research thread.",
  "ck-delete":
    "Delete a Chitking research thread directory only after explicit user confirmation.",
  "ck-orient":
    "Print the human checkpoint for the active Chitking research thread.",
  "ck-step":
    "Move Chitking stage/readiness only with explicit human consent.",
  "ck-dispatch":
    "Generate Chitking role prompt packets for the active thread.",
  "ck-record":
    "Append factual role output to the active Chitking research thread when asked.",
  "ck-assess":
    "Heuristic content evaluation that recommends but does not apply stage/readiness changes.",
  "ck-iterate":
    "Archive the active thread and create a new thread with a predecessor link.",
};
const OPENCODE_DIR = ".opencode";
const OPENCODE_AGENTS_DIR = "agents";
const OPENCODE_COMMANDS_DIR = "commands";
const OPENCODE_SKILLS_DIR = "skills";
const OPENCODE_PLUGINS_DIR = "plugins";
const OPENCODE_CHITKING_CONTEXT_PLUGIN = "inject-chitking-context.js";
const CODEX_DIR = ".codex";
const CODEX_SKILLS_DIR = "skills";
const CODEX_CONFIG_TEMPLATE = "config.toml";
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
  noDispatch?: boolean;
}

export interface ConfirmationOptions {
  yes?: boolean;
}

export interface StepOptions {
  to?: string;
  readiness?: number;
  reason?: string;
  noDispatch?: boolean;
}

export interface FocusOptions {
  noDispatch?: boolean;
}

export interface DispatchOptions {
  role?: string;
}

export interface RecordOptions {
  type: RecordType;
  commit?: string;
  text: string;
}

export interface AssessCriterion {
  section?: string;
  check: string;
  value?: number | string;
}

interface RolePrompt {
  objective: string;
  stop_conditions: string[];
}

interface RoleDefinition {
  prompt: RolePrompt;
  min_stage?: string;
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
  stages: string[];
  stage_advancement: Record<string, number>;
  maturity_levels: string[];
  stage_criteria: Record<string, AssessCriterion[]>;
  maturity_criteria: Record<string, AssessCriterion[]>;
  roles: Record<string, RoleDefinition>;
  project_incomplete_markers: string[];
}

interface ThreadFrontmatter {
  thread: string;
  title: string;
  stage: string;
  maturity: string;
  readiness: number;
  readiness_source: string;
  recorded_commits: string[];
  updated_at: string;
  archived?: boolean;
  predecessor?: string;
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

interface ThreadSummary {
  slug: string;
  title: string;
  stage: string;
  maturity: string;
  readiness: number;
  archived: boolean;
  updatedAt: string;
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

function getOpenCodeCommandsDir(cwd: string): string {
  return path.join(cwd, OPENCODE_DIR, OPENCODE_COMMANDS_DIR);
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

function getOpenCodeCommandPath(cwd: string, command: CkCommand): string {
  return path.join(getOpenCodeCommandsDir(cwd), `${command}.md`);
}

function getCodexSkillsDir(cwd: string): string {
  return path.join(cwd, CODEX_DIR, CODEX_SKILLS_DIR);
}

function getCodexConfigPath(cwd: string): string {
  return path.join(cwd, CODEX_DIR, CODEX_CONFIG_TEMPLATE);
}

function getCodexCommandSkillDir(cwd: string, command: CkCommand): string {
  return path.join(getCodexSkillsDir(cwd), command);
}

function getCodexCommandSkillPath(cwd: string, command: CkCommand): string {
  return path.join(getCodexCommandSkillDir(cwd, command), "SKILL.md");
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

function commandTemplateContent(command: CkCommand): string {
  return fs.readFileSync(
    getChitkingRuntimeTemplateFilePath(COMMANDS_DIR, `${command}.md`),
    "utf-8",
  );
}

function openCodeCommandContent(command: CkCommand, commandContent: string): string {
  return `---
description: ${CK_COMMAND_DESCRIPTIONS[command]}
---

${commandContent}`;
}

function codexCommandSkillContent(command: CkCommand, commandContent: string): string {
  return `---
name: ${command}
description: ${CK_COMMAND_DESCRIPTIONS[command]}
---

${commandContent}`;
}

function codexConfigTemplateContent(): string {
  return fs.readFileSync(getCodexTemplatePath(CODEX_CONFIG_TEMPLATE), "utf-8");
}

function normalizeConfig(
  raw: Record<string, unknown>,
  defaults: ResearchConfig | undefined,
): ResearchConfig {
  const stagesSource = Array.isArray(raw.stages)
    ? raw.stages
    : Array.isArray(raw.maturity_ladder)
      ? raw.maturity_ladder
      : null;
  const stages = stagesSource
    ? stagesSource.filter((item): item is string => typeof item === "string")
    : (defaults?.stages ?? []);
  const advancementSource = isRecord(raw.stage_advancement)
    ? raw.stage_advancement
    : isRecord(raw.readiness_thresholds)
      ? raw.readiness_thresholds
      : null;
  const stageAdvancement = advancementSource
    ? Object.fromEntries(
        Object.entries(advancementSource).filter(
          (entry): entry is [string, number] => typeof entry[1] === "number",
        ),
      )
    : (defaults?.stage_advancement ?? {});
  const maturityLevelsSource = Array.isArray(raw.maturity_levels)
    ? raw.maturity_levels
    : null;
  const maturityLevels = maturityLevelsSource
    ? maturityLevelsSource.filter(
        (item): item is string => typeof item === "string",
      )
    : (defaults?.maturity_levels ?? [
        "nascent",
        "developing",
        "established",
        "mature",
      ]);
  const roles = isRecord(raw.roles)
    ? parseRoles(raw.roles, defaults?.roles ?? {})
    : (defaults?.roles ?? {});
  const markers = Array.isArray(raw.project_incomplete_markers)
    ? raw.project_incomplete_markers.filter(
        (item): item is string => typeof item === "string",
      )
    : (defaults?.project_incomplete_markers ?? []);
  const stageCriteria = isRecord(raw.stage_criteria)
    ? parseAssessCriteria(raw.stage_criteria)
    : (defaults?.stage_criteria ?? {});
  const maturityCriteria = isRecord(raw.maturity_criteria)
    ? parseAssessCriteria(raw.maturity_criteria)
    : (defaults?.maturity_criteria ?? {});

  return {
    schema_version:
      typeof raw.schema_version === "number"
        ? raw.schema_version
        : (defaults?.schema_version ?? 1),
    stages: stages.length > 0 ? stages : (defaults?.stages ?? []),
    stage_advancement: { ...defaults?.stage_advancement, ...stageAdvancement },
    maturity_levels: maturityLevels,
    stage_criteria: stageCriteria,
    maturity_criteria: maturityCriteria,
    roles,
    project_incomplete_markers: markers,
  };
}

function parseAssessCriterion(raw: unknown): AssessCriterion {
  if (!isRecord(raw)) {
    throw new Error("Assessment criterion must be a YAML mapping");
  }
  if (typeof raw.check === "string") {
    const value = raw.value;
    if (
      value !== undefined &&
      typeof value !== "number" &&
      typeof value !== "string"
    ) {
      throw new Error("Assessment criterion value must be a number or string");
    }
    return {
      section: typeof raw.section === "string" ? raw.section : undefined,
      check: raw.check,
      value,
    };
  }
  if (typeof raw.history_contains === "string") {
    return {
      check: "history_contains",
      value: raw.history_contains,
    };
  }
  throw new Error(
    'Assessment criterion must have a "check" field or a "history_contains" key',
  );
}

function parseAssessCriteria(raw: unknown): Record<string, AssessCriterion[]> {
  if (!isRecord(raw)) return {};
  const result: Record<string, AssessCriterion[]> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) {
      result[key] = value.map((item, index) => {
        try {
          return parseAssessCriterion(item);
        } catch (error) {
          throw new Error(
            `${key}[${index}]: ${error instanceof Error ? error.message : error}`,
          );
        }
      });
    } else {
      result[key] = [];
    }
  }
  return result;
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
    role.min_stage ? `- Minimum stage: ${role.min_stage}` : null,
    role.min_readiness !== undefined
      ? `- Minimum readiness: ${role.min_readiness}`
      : null,
  ].filter((line): line is string => line !== null);
  const gateText = gates.length > 0 ? gates.join("\n") : "- No stage gate.";

  return `# Chitking ${roleTitle(roleName)} Role\n\n## Objective\n\n${role.prompt.objective}\n\n## Scope and Gates\n\n${gateText}\n\n## Required Inputs\n\n- Read \`research/project.md\` before the active thread.\n- Read the active \`research/<thread>/thread.md\`.\n- Use the per-thread packet from \`chitking dispatch --role ${roleName}\` for current file references, stage, readiness, warnings, and stop conditions.\n\n## Warnings\n\n${warnings}\n\n## Stop Conditions\n\n${stopConditions}\n\n## Universal Boundaries\n\n- Do not change stage or readiness; humans own those checkpoints.\n- Do not treat generated packets as source of truth; project and thread Markdown files are canonical.\n- Record factual output with \`chitking record\` only when a human or calling workflow asks for it.\n`;
}

function dreamerRoleContractContent(role: RoleDefinition): string {
  const warnings = role.warnings.map((warning) => `- ${warning}`).join("\n");
  const stopConditions = role.prompt.stop_conditions
    .map((condition) => `- ${condition}`)
    .join("\n");

  return `# Chitking Dreamer Role\n\n## Objective\n\n${role.prompt.objective}\n\n## Required Inputs\n\n- Theory brief.\n- Open questions.\n- Constraints and non-goals.\n- Unresolved objections.\n- Failed paths.\n- The current per-thread packet from \`chitking dispatch --role dreamer\`.\n\n## Output Shape\n\nProduce bounded ideation candidates, not an implementation plan:\n\n- Hypotheses that may explain the current capability gap.\n- Strange analogies that could reveal hidden structure.\n- Candidate mechanisms worth investigating.\n- Edge cases and failure modes that stress the theory.\n- Possible theory directions that require review before adoption.\n\n## Hard Boundaries\n\n- Do not create implementation tasks.\n- Do not assign work to build, Executor, or any implementation role.\n- Do not hand Dreamer output directly to build or Executor.\n- Do not present ideation as approved next safe action.\n- Route candidates through human, oracle, or planner review before they can become implementation work.\n\n## Warnings\n\n${warnings}\n\n## Stop Conditions\n\n${stopConditions}\n`;
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
  return `---\ndescription: |\n  Chitking ${roleTitle(roleName)} adapter with embedded canonical role contract.\nmode: subagent\npermission:\n  read: ${permission.read}\n  edit: ${permission.edit}\n  bash: ${permission.bash}\n  glob: ${permission.glob}\n  grep: ${permission.grep}\n  list: ${permission.list}\n  task: ${permission.task}\n---\n# Chitking ${roleTitle(roleName)} Adapter\n\nYou are the Chitking \`${roleName}\` role adapter for OpenCode.\n\nUse the active thread packet generated by:\n\n- \`chitking dispatch --role ${roleName}\`\n\nRole objective summary:\n\n${role.prompt.objective}\n${dreamerBoundary}\n## Embedded Canonical Role Contract\n\n${contractContent}`;
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
description: Trigger when working in a Chitking repo, using chitking commands, interpreting Chitking workflow/state files, or handling research threads, stage, maturity, readiness, roles, or generated packets.
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

function ensureSlashCommands(cwd: string): void {
  ensureDir(path.join(cwd, CODEX_DIR));
  writeFileIfMissing(getCodexConfigPath(cwd), codexConfigTemplateContent());
  ensureDir(getOpenCodeCommandsDir(cwd));
  ensureDir(getCodexSkillsDir(cwd));
  for (const command of CK_COMMANDS) {
    const commandContent = commandTemplateContent(command);
    writeFileIfMissing(
      getOpenCodeCommandPath(cwd, command),
      openCodeCommandContent(command, commandContent),
    );
    ensureDir(getCodexCommandSkillDir(cwd, command));
    writeFileIfMissing(
      getCodexCommandSkillPath(cwd, command),
      codexCommandSkillContent(command, commandContent),
    );
  }
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
    const minStage =
      typeof value.min_stage === "string"
        ? value.min_stage
        : typeof value.min_maturity === "string"
          ? value.min_maturity
          : undefined;
    roles[name] = {
      min_stage: minStage,
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
      "No active Chitking thread. Run chitking new <title> first.",
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

function readActiveThreadOrNull(cwd: string): string | null {
  if (!fs.existsSync(getActivePath(cwd))) {
    return null;
  }
  return parseActiveState(cwd).active_thread;
}

function clearActiveThreadIfMatches(cwd: string, slug: string): void {
  if (readActiveThreadOrNull(cwd) === slug) {
    writeActiveState(cwd, null);
  }
}

function readUsableActiveThreadOrNull(cwd: string): string | null {
  const activeThread = readActiveThreadOrNull(cwd);
  if (!activeThread) {
    return null;
  }
  if (!fs.existsSync(getThreadPath(cwd, activeThread))) {
    writeActiveState(cwd, null);
    return null;
  }
  const thread = readThread(cwd, activeThread);
  if (isThreadArchived(thread)) {
    writeActiveState(cwd, null);
    return null;
  }
  return activeThread;
}

function resolveActiveThread(cwd: string): string {
  const active = parseActiveState(cwd);
  if (!active.active_thread) {
    throw new Error(
      "No active Chitking thread. Run chitking new <title> or chitking focus <thread> first.",
    );
  }
  if (!fs.existsSync(getThreadPath(cwd, active.active_thread))) {
    writeActiveState(cwd, null);
    throw new Error(
      `Active Chitking thread is missing: ${active.active_thread}. Run chitking list or chitking focus <thread>.`,
    );
  }
  const thread = readThread(cwd, active.active_thread);
  if (isThreadArchived(thread)) {
    writeActiveState(cwd, null);
    throw new Error(
      `Active Chitking thread is archived: ${active.active_thread}. Run chitking restore ${active.active_thread} or chitking focus <thread>.`,
    );
  }
  return active.active_thread;
}

function resolveActiveThreadReadOnly(cwd: string): string {
  const active = parseActiveState(cwd);
  if (!active.active_thread) {
    throw new Error(
      "No active Chitking thread. Run chitking new <title> or chitking focus <thread> first.",
    );
  }
  if (!fs.existsSync(getThreadPath(cwd, active.active_thread))) {
    throw new Error(
      `Active Chitking thread is missing: ${active.active_thread}. Run chitking list or chitking focus <thread>.`,
    );
  }
  const thread = readThread(cwd, active.active_thread);
  if (isThreadArchived(thread)) {
    throw new Error(
      `Active Chitking thread is archived: ${active.active_thread}. Run chitking restore ${active.active_thread} or chitking focus <thread>.`,
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

function readStageAndMaturity(raw: Record<string, unknown>): { stage: string; maturity: string } {
  const stageValue = typeof raw.stage === "string" && raw.stage.length > 0 ? raw.stage : null;
  const legacyMaturityValue =
    typeof raw.maturity === "string" && raw.maturity.length > 0 ? raw.maturity : null;

  if (stageValue) {
    const maturityValue = legacyMaturityValue ?? "nascent";
    return { stage: stageValue, maturity: maturityValue };
  }

  if (legacyMaturityValue) {
    console.warn(
      "Migrating frontmatter: maturity→stage. Run chitking show to verify.",
    );
    return { stage: legacyMaturityValue, maturity: "nascent" };
  }

  throw new Error("thread.md frontmatter missing required string field: stage");
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
  const { stage, maturity } = readStageAndMaturity(raw);
  const readinessSource = stringField(raw, "readiness_source");
  const updatedAt = stringField(raw, "updated_at");
  const frontmatter: ThreadFrontmatter = {
    thread,
    title,
    stage,
    maturity,
    readiness,
    readiness_source: readinessSource,
    recorded_commits: recordedCommits,
    updated_at: updatedAt,
  };
  if (raw.archived === true) {
    frontmatter.archived = true;
  }
  if (typeof raw.predecessor === "string" && raw.predecessor.length > 0) {
    frontmatter.predecessor = raw.predecessor;
  }
  return {
    frontmatter,
    body: match[2],
  };
}

function isThreadArchived(thread: ParsedThread): boolean {
  return thread.frontmatter.archived === true;
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

function requireThreadNotArchived(slug: string, thread: ParsedThread): void {
  if (isThreadArchived(thread)) {
    throw new Error(
      `Thread is archived: ${slug}. Run chitking restore ${slug} first.`,
    );
  }
}

function listThreadSummaries(cwd: string, includeArchived = false): ThreadSummary[] {
  const researchDir = getResearchDir(cwd);
  if (!fs.existsSync(researchDir)) {
    return [];
  }

  return fs
    .readdirSync(researchDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((slug) => fs.existsSync(getThreadPath(cwd, slug)))
    .map((slug) => {
      const thread = readThread(cwd, slug);
      return {
        slug,
        title: thread.frontmatter.title,
        stage: thread.frontmatter.stage,
        maturity: thread.frontmatter.maturity,
        readiness: thread.frontmatter.readiness,
        archived: isThreadArchived(thread),
        updatedAt: thread.frontmatter.updated_at,
      };
    })
    .filter((summary) => includeArchived || !summary.archived)
    .sort((left, right) => left.slug.localeCompare(right.slug));
}

function formatThreadSummary(
  summary: ThreadSummary,
  activeThread: string | null,
): string {
  const activeText = summary.slug === activeThread ? " [active]" : "";
  const archivedText = summary.archived ? " [archived]" : "";
  return `- ${summary.slug} — ${summary.title} (${summary.stage}, readiness ${summary.readiness})${activeText}${archivedText}`;
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

function extractSectionBody(body: string, section: string): string {
  const heading = `## ${section}`;
  const headingIndex = body.indexOf(heading);
  if (headingIndex === -1) {
    return "";
  }
  const afterHeading = headingIndex + heading.length;
  const nextHeadingMatch = /\n## /g;
  nextHeadingMatch.lastIndex = afterHeading;
  const nextHeading = nextHeadingMatch.exec(body);
  const endIndex = nextHeading?.index ?? body.length;
  return body.slice(afterHeading, endIndex).trim();
}

function evaluateCriterion(
  body: string,
  criterion: AssessCriterion,
): { passed: boolean; detail: string } {
  switch (criterion.check) {
    case "non-empty": {
      const sectionBody = extractSectionBody(body, criterion.section ?? "");
      const text = sectionBody.replace(/\s+/g, " ").trim();
      const passed = text.length > 0;
      return {
        passed,
        detail: passed ? "non-empty" : "empty (0 words)",
      };
    }
    case "min-bullets": {
      const sectionBody = extractSectionBody(body, criterion.section ?? "");
      const bullets = sectionBody
        .split("\n")
        .filter((line) => line.trim().startsWith("-")).length;
      const required = Number(criterion.value ?? 0);
      const passed = bullets >= required;
      return {
        passed,
        detail: `≥${required} bullets (${bullets} found)`,
      };
    }
    case "min-words": {
      const sectionBody = extractSectionBody(body, criterion.section ?? "");
      const words = sectionBody
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0).length;
      const required = Number(criterion.value ?? 0);
      const passed = words >= required;
      return {
        passed,
        detail: `≥${required} words (${words} found)`,
      };
    }
    case "history_contains": {
      const sectionBody = extractSectionBody(
        body,
        "Decisions & Maturity History",
      );
      const needle = String(criterion.value ?? "");
      const passed = sectionBody.toLowerCase().includes(needle.toLowerCase());
      return {
        passed,
        detail: passed ? `contains "${needle}"` : `missing "${needle}"`,
      };
    }
    default:
      throw new Error(`Unknown assess check type: ${criterion.check}`);
  }
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
  if (role.min_stage) {
    const currentIndex = config.stages.indexOf(thread.stage);
    const requiredIndex = config.stages.indexOf(role.min_stage);
    if (
      requiredIndex !== -1 &&
      currentIndex !== -1 &&
      currentIndex < requiredIndex
    ) {
      warnings.push(
        `stage ${thread.stage} is before role minimum ${role.min_stage}`,
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

export function chitkingInit(
  cwd: string = process.cwd(),
  options: { noDispatch?: boolean } = {},
): void {
  const chitkingDir = getChitkingDir(cwd);
  const researchDir = getResearchDir(cwd);
  ensureDir(chitkingDir);
  ensureDir(researchDir);
  writeFileIfMissing(getConfigPath(cwd), defaultConfigTemplateContent());
  const config = loadConfig(cwd);
  ensureRoleHarness(cwd, config);
  ensureChitkingWorkflowSkill(cwd);
  ensureSlashCommands(cwd);
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
  if (!options.noDispatch) {
    const activeThread = readActiveThreadOrNull(cwd);
    if (activeThread) {
      autoDispatch(cwd, activeThread, config);
    }
  }
  console.log("Chitking initialized.");
}

export function chitkingNew(
  title: string,
  options: NewThreadOptions = {},
  cwd: string = process.cwd(),
): string {
  if (!fs.existsSync(getProjectPath(cwd))) {
    throw new Error("research/project.md is required. Run chitking init first.");
  }
  const config = loadConfig(cwd);
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
      stage: "seed",
      maturity: "nascent",
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
  if (!options.noDispatch) {
    autoDispatch(cwd, slug, config);
  }
  return slug;
}

export function chitkingList(cwd: string = process.cwd()): string {
  loadConfig(cwd);
  const activeThread = readUsableActiveThreadOrNull(cwd);
  const summaries = listThreadSummaries(cwd);
  const output =
    summaries.length === 0
      ? "No non-archived research threads."
      : summaries
          .map((summary) => formatThreadSummary(summary, activeThread))
          .join("\n");
  console.log(output);
  return output;
}

export function chitkingShow(
  thread?: string,
  cwd: string = process.cwd(),
): string {
  loadConfig(cwd);
  const slug = thread ? validateSlug(thread) : resolveActiveThread(cwd);
  const parsedThread = readThread(cwd, slug);
  const lines = [
    `Thread: ${slug}`,
    `Title: ${parsedThread.frontmatter.title}`,
    `Stage: ${parsedThread.frontmatter.stage}`,
    `Maturity: ${parsedThread.frontmatter.maturity}`,
    `Readiness: ${parsedThread.frontmatter.readiness} (${parsedThread.frontmatter.readiness_source})`,
    `Archived: ${isThreadArchived(parsedThread) ? "yes" : "no"}`,
    `Updated: ${parsedThread.frontmatter.updated_at}`,
    `Thread file: ${toRepoPath(cwd, getThreadPath(cwd, slug))}`,
    `Context cache: ${toRepoPath(cwd, getContextDir(cwd, slug))}`,
  ];
  const output = lines.join("\n");
  console.log(output);
  return output;
}

export function chitkingFocus(
  thread?: string,
  options: FocusOptions = {},
  cwd: string = process.cwd(),
): string {
  if (!thread) {
    throw new Error("chitking focus requires <thread>. Use chitking show or chitking list.");
  }
  const config = loadConfig(cwd);
  const slug = validateSlug(thread);
  const parsedThread = readThread(cwd, slug);
  requireThreadNotArchived(slug, parsedThread);
  writeActiveState(cwd, slug);
  console.log(`Active thread: ${slug}`);
  if (!options.noDispatch) {
    autoDispatch(cwd, slug, config);
  }
  return slug;
}

export function chitkingRename(
  thread: string,
  title: string,
  cwd: string = process.cwd(),
): void {
  loadConfig(cwd);
  const cleanTitle = title.trim();
  if (cleanTitle.length === 0) {
    throw new Error("chitking rename requires a non-empty title.");
  }
  const slug = validateSlug(thread);
  const parsedThread = readThread(cwd, slug);
  parsedThread.frontmatter.title = cleanTitle;
  parsedThread.frontmatter.updated_at = nowIso();
  writeThread(cwd, slug, parsedThread);
  console.log(`Renamed research thread: ${slug}`);
}

export function chitkingArchive(
  thread: string,
  options: ConfirmationOptions = {},
  cwd: string = process.cwd(),
): void {
  if (options.yes !== true) {
    throw new Error("chitking archive requires --yes.");
  }
  loadConfig(cwd);
  const slug = validateSlug(thread);
  const parsedThread = readThread(cwd, slug);
  parsedThread.frontmatter.archived = true;
  parsedThread.frontmatter.updated_at = nowIso();
  writeThread(cwd, slug, parsedThread);
  clearActiveThreadIfMatches(cwd, slug);
  console.log(`Archived research thread: ${slug}`);
}

export function chitkingRestore(
  thread: string,
  cwd: string = process.cwd(),
): void {
  loadConfig(cwd);
  const slug = validateSlug(thread);
  const parsedThread = readThread(cwd, slug);
  delete parsedThread.frontmatter.archived;
  parsedThread.frontmatter.updated_at = nowIso();
  writeThread(cwd, slug, parsedThread);
  console.log(`Restored research thread: ${slug}`);
}

export function chitkingDelete(
  thread: string,
  options: ConfirmationOptions = {},
  cwd: string = process.cwd(),
): void {
  if (options.yes !== true) {
    throw new Error("chitking delete requires --yes.");
  }
  loadConfig(cwd);
  const slug = validateSlug(thread);
  const threadPath = getThreadPath(cwd, slug);
  if (!fs.existsSync(threadPath)) {
    throw new Error(`Thread not found: ${slug}`);
  }
  fs.rmSync(getThreadDir(cwd, slug), { recursive: true, force: true });
  clearActiveThreadIfMatches(cwd, slug);
  console.log(`Deleted research thread: ${slug}`);
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
  const currentIndex = config.stages.indexOf(thread.frontmatter.stage);
  const nextStage =
    currentIndex >= 0 && currentIndex < config.stages.length - 1
      ? config.stages[currentIndex + 1]
      : config.stages[0];

  const lines = [
    `Active thread: ${slug}`,
    `Stage: ${thread.frontmatter.stage}`,
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
  if (nextStage) {
    lines.push(
      `- If the thread is ready, run: chitking step --to ${nextStage} --reason "..."`,
    );
  }
  lines.push(
    "- Edit research/project.md or thread.md directly before agent fan-out.",
  );
  lines.push("- Refresh role packets with: chitking dispatch [--role <role>]");
  lines.push("", "Recovery options if stuck:");
  lines.push(
    '- Record a failed path with: chitking record --type failure --text "..."',
  );
  lines.push(
    '- Move stage backward with: chitking step --to <stage> --reason "..."',
  );

  const output = lines.join("\n");
  console.log(output);
  return output;
}

export function chitkingAssess(
  thread?: string,
  cwd: string = process.cwd(),
): string {
  const config = loadConfig(cwd);
  const slug = thread ? validateSlug(thread) : resolveActiveThreadReadOnly(cwd);
  const parsedThread = readThread(cwd, slug);
  const { frontmatter, body } = parsedThread;

  const lines: string[] = [
    `Assessment for thread: ${slug}`,
    "",
    `Stage: ${frontmatter.stage} (readiness ${frontmatter.readiness}, maturity ${frontmatter.maturity})`,
    "",
  ];

  const stageCriteria = config.stage_criteria[frontmatter.stage] ?? [];
  const failedStageSections: string[] = [];
  if (stageCriteria.length === 0) {
    lines.push(`No criteria configured for stage ${frontmatter.stage}.`);
  } else {
    lines.push(
      `Stage advancement criteria (to advance from ${frontmatter.stage}):`,
    );
    let passedCount = 0;
    for (const criterion of stageCriteria) {
      const result = evaluateCriterion(body, criterion);
      const sectionName = criterion.section ?? "Decisions & Maturity History";
      lines.push(`  ${result.passed ? "✓" : "✗"} ${sectionName}: ${result.detail}`);
      if (result.passed) {
        passedCount++;
      } else {
        failedStageSections.push(sectionName);
      }
    }
    const ready = passedCount === stageCriteria.length;
    lines.push(
      `→ Readiness to advance: ${passedCount}/${stageCriteria.length} criteria met — ${ready ? "ready to step" : "not ready to step"}`,
    );
  }

  lines.push("");

  const maturityIndex = config.maturity_levels.indexOf(frontmatter.maturity);
  const nextMaturity =
    maturityIndex >= 0 && maturityIndex < config.maturity_levels.length - 1
      ? config.maturity_levels[maturityIndex + 1]
      : null;

  if (!nextMaturity) {
    lines.push("Already at highest maturity level.");
  } else {
    const maturityCriteria = config.maturity_criteria[nextMaturity] ?? [];
    if (maturityCriteria.length === 0) {
      lines.push(`No criteria configured for maturity ${nextMaturity}.`);
    } else {
      lines.push(`Maturity criteria (for next level: ${nextMaturity}):`);
      let passedCount = 0;
      for (const criterion of maturityCriteria) {
        const result = evaluateCriterion(body, criterion);
        const sectionName = criterion.section ?? "Decisions & Maturity History";
        lines.push(
          `  ${result.passed ? "✓" : "✗"} ${sectionName}: ${result.detail}`,
        );
        if (result.passed) passedCount++;
      }
      const recommend =
        passedCount === maturityCriteria.length
          ? nextMaturity
          : frontmatter.maturity;
      lines.push(
        `→ Maturity recommendation: ${recommend} (${passedCount}/${maturityCriteria.length} criteria met)`,
      );
      lines.push(
        `→ To apply: edit thread.md frontmatter \`maturity: ${recommend}\``,
      );
    }
  }

  lines.push("", "Suggested next actions:");
  if (failedStageSections.length > 0) {
    for (const section of failedStageSections) {
      lines.push(`  - Fill ${section} to advance readiness.`);
    }
  }
  if (nextMaturity) {
    const maturityCriteria = config.maturity_criteria[nextMaturity] ?? [];
    const evidenceCriterion = maturityCriteria.find(
      (criterion) => criterion.section === "Evidence",
    );
    if (
      evidenceCriterion &&
      !evaluateCriterion(body, evidenceCriterion).passed
    ) {
      lines.push(`  - chitking record --type evidence --text "..."`);
    }
  }
  const currentStageIndex = config.stages.indexOf(frontmatter.stage);
  const nextStage =
    currentStageIndex >= 0 && currentStageIndex < config.stages.length - 1
      ? config.stages[currentStageIndex + 1]
      : null;
  if (failedStageSections.length === 0 && nextStage) {
    lines.push(`  - chitking step --to ${nextStage} --reason "..."`);
  }
  if (lines[lines.length - 1] === "Suggested next actions:") {
    lines.push("  - Configure assessment criteria in .chitking/config.yaml.");
  }

  const output = lines.join("\n");
  console.log(output);
  return output;
}

export function chitkingIterate(
  title: string,
  options: NewThreadOptions = {},
  cwd: string = process.cwd(),
): string {
  if (!fs.existsSync(getProjectPath(cwd))) {
    throw new Error("research/project.md is required. Run chitking init first.");
  }
  const config = loadConfig(cwd);
  const oldSlug = resolveActiveThread(cwd);
  const oldThread = readThread(cwd, oldSlug);
  requireThreadNotArchived(oldSlug, oldThread);

  oldThread.frontmatter.archived = true;
  oldThread.frontmatter.updated_at = nowIso();
  writeThread(cwd, oldSlug, oldThread);
  clearActiveThreadIfMatches(cwd, oldSlug);

  const newSlug = options.slug
    ? validateSlug(options.slug)
    : slugifyTitle(title);
  const newThreadPath = getThreadPath(cwd, newSlug);
  if (fs.existsSync(newThreadPath)) {
    throw new Error(`Thread already exists: ${newSlug}`);
  }
  ensureDir(getThreadDir(cwd, newSlug));
  ensureDir(getContextDir(cwd, newSlug));

  const newThread: ParsedThread = {
    frontmatter: {
      thread: newSlug,
      title,
      stage: "seed",
      maturity: "nascent",
      readiness: 1,
      readiness_source: "human",
      recorded_commits: [],
      updated_at: nowIso(),
      predecessor: oldSlug,
    },
    body: defaultThreadBody(),
  };
  newThread.body = appendToSection(
    newThread.body,
    "Decisions & Maturity History",
    `Iterated from ${oldSlug} (archived).`,
  );
  writeThread(cwd, newSlug, newThread);
  writeActiveState(cwd, newSlug);

  console.log(`Iterated: ${oldSlug} → ${newSlug}`);
  if (!options.noDispatch) {
    autoDispatch(cwd, newSlug, config);
  }
  return newSlug;
}

export function chitkingStep(
  options: StepOptions = {},
  cwd: string = process.cwd(),
): void {
  const config = loadConfig(cwd);
  const slug = resolveActiveThread(cwd);
  const thread = readThread(cwd, slug);
  const stageIndex = config.stages.indexOf(thread.frontmatter.stage);
  if (stageIndex === -1) {
    throw new Error(`Unknown current stage: ${thread.frontmatter.stage}`);
  }

  let targetStage = options.to;
  const isLoopBack =
    !targetStage && stageIndex === config.stages.length - 1;
  const readiness =
    options.readiness !== undefined && !isLoopBack
      ? validateReadiness(options.readiness)
      : 1;
  if (targetStage) {
    if (!options.reason || options.reason.trim().length === 0) {
      throw new Error("chitking step --to requires --reason.");
    }
    if (!config.stages.includes(targetStage)) {
      throw new Error(`Unknown stage: ${targetStage}`);
    }
  } else {
    targetStage = isLoopBack
      ? config.stages[0]
      : config.stages[stageIndex + 1];
  }

  const previousStage = thread.frontmatter.stage;
  const previousReadiness = thread.frontmatter.readiness;
  thread.frontmatter.stage = targetStage;
  thread.frontmatter.readiness = readiness;
  thread.frontmatter.readiness_source = "human";
  thread.frontmatter.updated_at = nowIso();
  const reason = options.reason ? ` Reason: ${options.reason.trim()}` : "";
  const readinessText =
    previousReadiness === thread.frontmatter.readiness
      ? `readiness ${thread.frontmatter.readiness}`
      : `readiness ${previousReadiness}→${thread.frontmatter.readiness}`;
  const historyEntry = isLoopBack
    ? `cycle complete; looped ${previousStage}→${targetStage}; readiness reset to 1.${reason}`
    : `stage ${previousStage}→${targetStage}; ${readinessText}.${reason}`;
  thread.body = appendToSection(
    thread.body,
    "Decisions & Maturity History",
    historyEntry,
  );
  writeThread(cwd, slug, thread);
  console.log(`Updated ${slug}: ${previousStage} → ${targetStage}`);
  if (!options.noDispatch) {
    autoDispatch(cwd, slug, config);
  }
}

function buildRolePacket(
  cwd: string,
  slug: string,
  roleName: string,
  role: RoleDefinition,
  config: ResearchConfig,
): string {
  const thread = readThread(cwd, slug);
  ensureDir(getContextDir(cwd, slug));
  const packetPath = getContextPath(cwd, slug, roleName);
  const packet = {
    role: roleName,
    thread: slug,
    project_file: toRepoPath(cwd, getProjectPath(cwd)),
    thread_file: toRepoPath(cwd, getThreadPath(cwd, slug)),
    stage: thread.frontmatter.stage,
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
  return toRepoPath(cwd, packetPath);
}

function autoDispatch(
  cwd: string,
  slug: string,
  config: ResearchConfig,
): void {
  let successCount = 0;
  const failures: string[] = [];
  for (const [roleName, role] of Object.entries(config.roles)) {
    try {
      buildRolePacket(cwd, slug, roleName, role, config);
      successCount++;
    } catch (error) {
      failures.push(
        `${roleName}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
  if (failures.length > 0) {
    console.log(
      `Dispatched ${successCount} role packets for ${slug}; ${failures.length} failed.`,
    );
  } else {
    console.log(`Dispatched ${successCount} role packets for ${slug}.`);
  }
}

export function chitkingDispatch(
  options: DispatchOptions = {},
  cwd: string = process.cwd(),
): string {
  const config = loadConfig(cwd);
  const slug = resolveActiveThread(cwd);

  if (options.role) {
    const role = config.roles[options.role];
    if (!role) {
      throw new Error(`Unknown role: ${options.role}`);
    }
    const repoPath = buildRolePacket(cwd, slug, options.role, role, config);
    console.log(repoPath);
    return repoPath;
  }

  const paths: string[] = [];
  const failures: string[] = [];
  for (const [roleName, role] of Object.entries(config.roles)) {
    try {
      const repoPath = buildRolePacket(cwd, slug, roleName, role, config);
      paths.push(repoPath);
      console.log(repoPath);
    } catch (error) {
      failures.push(
        `${roleName}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
  if (failures.length > 0) {
    console.error(
      `Failed to dispatch ${failures.length} role(s):\n${failures.join("\n")}`,
    );
  }
  return paths.join("\n");
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
