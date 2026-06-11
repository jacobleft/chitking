import fs from "node:fs";
import path from "node:path";
import { parse, stringify } from "yaml";

import {
  getOpenCodeTemplatePath,
  getRtTemplatePath,
} from "../templates/extract.js";

const RESEARCH_TRELLIS_DIR = ".research-trellis";
const RESEARCH_DIR = "research";
const CONTEXT_IGNORE_PATTERN = "research/*/context/*.yaml";
const ROLES_DIR = "roles";
const SKILLS_DIR = "skills";
const RT_WORKFLOW_SKILL = "rt-workflow";
const OPENCODE_DIR = ".opencode";
const OPENCODE_AGENTS_DIR = "agents";
const OPENCODE_SKILLS_DIR = "skills";
const OPENCODE_PLUGINS_DIR = "plugins";
const OPENCODE_RT_CONTEXT_PLUGIN = "inject-rt-context.js";

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
    message:
      "Chitking init scaffold behavior is available. Later RT commands are not migrated yet.",
  };
}

export function formatChitkingStatus(
  status: ChitkingStatus = getChitkingStatus(),
): string {
  return `${status.productName} (${status.chineseName}): ${status.message}`;
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

function nowIso(): string {
  return new Date().toISOString();
}

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function writeFileIfMissing(filePath: string, content: string): void {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, "utf-8");
  }
}

function roleTitle(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function defaultConfigTemplateContent(): string {
  return fs.readFileSync(getRtTemplatePath("config.yaml"), "utf-8");
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
    throw new Error("RT default config template must contain a YAML mapping");
  }
  return normalizeConfig(raw, undefined);
}

function readYamlRecord(filePath: string): Record<string, unknown> {
  const parsed = parse(fs.readFileSync(filePath, "utf-8")) as unknown;
  if (!isRecord(parsed)) {
    throw new Error(`${filePath} must contain a YAML mapping`);
  }
  return parsed;
}

function loadConfig(cwd: string): ResearchConfig {
  const configPath = path.join(cwd, RESEARCH_TRELLIS_DIR, "config.yaml");
  if (!fs.existsSync(configPath)) {
    throw new Error("Run chitking init before using Chitking commands.");
  }

  return normalizeConfig(readYamlRecord(configPath), defaultConfig());
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

  return `# Research Trellis ${roleTitle(roleName)} Role\n\n## Objective\n\n${role.prompt.objective}\n\n## Scope and Gates\n\n${gateText}\n\n## Required Inputs\n\n- Read \`research/project.md\` before the active thread.\n- Read the active \`research/<thread>/thread.md\`.\n- Use the per-thread packet from \`rt pack --role ${roleName}\` for current file references, maturity, readiness, warnings, and stop conditions.\n\n## Warnings\n\n${warnings}\n\n## Stop Conditions\n\n${stopConditions}\n\n## Universal Boundaries\n\n- Do not change maturity or readiness; humans own those checkpoints.\n- Do not treat generated packets as source of truth; project and thread Markdown files are canonical.\n- Record factual output with \`rt record\` only when a human or calling workflow asks for it.\n`;
}

function dreamerRoleContractContent(role: RoleDefinition): string {
  const warnings = role.warnings.map((warning) => `- ${warning}`).join("\n");
  const stopConditions = role.prompt.stop_conditions
    .map((condition) => `- ${condition}`)
    .join("\n");

  return `# Research Trellis Dreamer Role\n\n## Objective\n\n${role.prompt.objective}\n\n## Required Inputs\n\n- Theory brief.\n- Open questions.\n- Constraints and non-goals.\n- Unresolved objections.\n- Failed paths.\n- The current per-thread packet from \`rt pack --role dreamer\`.\n\n## Output Shape\n\nProduce bounded ideation candidates, not an implementation plan:\n\n- Hypotheses that may explain the current capability gap.\n- Strange analogies that could reveal hidden structure.\n- Candidate mechanisms worth investigating.\n- Edge cases and failure modes that stress the theory.\n- Possible theory directions that require review before adoption.\n\n## Hard Boundaries\n\n- Do not create implementation tasks.\n- Do not assign work to build, Executor, or any implementation role.\n- Do not hand Dreamer output directly to build or Executor.\n- Do not present ideation as approved next safe action.\n- Route candidates through human, oracle, or planner review before they can become implementation work.\n\n## Warnings\n\n${warnings}\n\n## Stop Conditions\n\n${stopConditions}\n`;
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
  return `---\ndescription: |\n  Research Trellis ${roleTitle(roleName)} adapter with embedded canonical role contract.\nmode: subagent\npermission:\n  read: ${permission.read}\n  edit: ${permission.edit}\n  bash: ${permission.bash}\n  glob: ${permission.glob}\n  grep: ${permission.grep}\n  list: ${permission.list}\n  task: ${permission.task}\n---\n# Research Trellis ${roleTitle(roleName)} Adapter\n\nYou are the Research Trellis \`${roleName}\` role adapter for OpenCode.\n\nUse the active thread packet generated by:\n\n- \`rt pack --role ${roleName}\`\n\nRole objective summary:\n\n${role.prompt.objective}\n${dreamerBoundary}\n## Embedded Canonical Role Contract\n\n${contractContent}`;
}

function defaultProjectContent(): string {
  return `# Research Project Context\n\n## Research Domain\nTODO: describe the domain this repository studies.\n\n## Core Theoretical Commitments\nTODO: list the commitments that should remain stable across threads.\n\n## Modeling Assumptions\nTODO: capture assumptions agents should not silently change.\n\n## Verification Standards\nTODO: define what counts as evidence.\n\n## Code/Experiment Norms\nTODO: describe repository-specific implementation and experiment norms.\n\n## Non-Goals\nTODO: list work this research harness should not pursue.\n`;
}

function ensureRoleHarness(cwd: string, config: ResearchConfig): void {
  const rolesDir = path.join(cwd, RESEARCH_TRELLIS_DIR, ROLES_DIR);
  const agentsDir = path.join(cwd, OPENCODE_DIR, OPENCODE_AGENTS_DIR);
  ensureDir(rolesDir);
  ensureDir(agentsDir);
  for (const [roleName, role] of Object.entries(config.roles)) {
    const contractContent =
      roleName === "dreamer"
        ? dreamerRoleContractContent(role)
        : defaultRoleContractContent(roleName, role);
    writeFileIfMissing(path.join(rolesDir, `${roleName}.md`), contractContent);
    writeFileIfMissing(
      path.join(agentsDir, `rt-${roleName}.md`),
      opencodeAdapterContent(roleName, role, contractContent),
    );
  }
}

function ensureRtWorkflowSkill(cwd: string): void {
  const canonicalContent = fs.readFileSync(
    getRtTemplatePath(SKILLS_DIR, `${RT_WORKFLOW_SKILL}.md`),
    "utf-8",
  );
  ensureDir(path.join(cwd, RESEARCH_TRELLIS_DIR, SKILLS_DIR));
  const opencodeSkillDir = path.join(
    cwd,
    OPENCODE_DIR,
    OPENCODE_SKILLS_DIR,
    RT_WORKFLOW_SKILL,
  );
  ensureDir(opencodeSkillDir);
  writeFileIfMissing(
    path.join(cwd, RESEARCH_TRELLIS_DIR, SKILLS_DIR, `${RT_WORKFLOW_SKILL}.md`),
    canonicalContent,
  );
  writeFileIfMissing(
    path.join(opencodeSkillDir, "SKILL.md"),
    `---\nname: rt-workflow\ndescription: Trigger when working in a Research Trellis repo, using rt commands, interpreting RT workflow/state files, or handling research threads, maturity, readiness, roles, or generated packets.\n---\n${canonicalContent}`,
  );
}

function ensureOpenCodeRtContextPlugin(cwd: string): void {
  const pluginsDir = path.join(cwd, OPENCODE_DIR, OPENCODE_PLUGINS_DIR);
  ensureDir(pluginsDir);
  writeFileIfMissing(
    path.join(pluginsDir, OPENCODE_RT_CONTEXT_PLUGIN),
    fs.readFileSync(
      getOpenCodeTemplatePath(OPENCODE_PLUGINS_DIR, OPENCODE_RT_CONTEXT_PLUGIN),
      "utf-8",
    ),
  );
}

function ensureContextGitignore(cwd: string): void {
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
}

export function chitkingInit(cwd: string = process.cwd()): void {
  ensureDir(path.join(cwd, RESEARCH_TRELLIS_DIR));
  ensureDir(path.join(cwd, RESEARCH_DIR));
  writeFileIfMissing(
    path.join(cwd, RESEARCH_TRELLIS_DIR, "config.yaml"),
    defaultConfigTemplateContent(),
  );
  writeFileIfMissing(
    path.join(cwd, RESEARCH_TRELLIS_DIR, "active.yaml"),
    stringify({ active_thread: null, updated_at: nowIso() }),
  );
  writeFileIfMissing(
    path.join(cwd, RESEARCH_DIR, "project.md"),
    defaultProjectContent(),
  );
  ensureRoleHarness(cwd, loadConfig(cwd));
  ensureRtWorkflowSkill(cwd);
  ensureOpenCodeRtContextPlugin(cwd);
  ensureContextGitignore(cwd);
  console.log("Research Trellis initialized.");
}
