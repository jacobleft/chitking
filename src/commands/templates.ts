import fs from "node:fs";
import path from "node:path";
import {
  CK_COMMANDS,
  CK_COMMAND_DESCRIPTIONS,
  REQUIRED_THREAD_SECTIONS,
  type CkCommand,
  type OpenCodePermissions,
  type ResearchConfig,
  type RoleDefinition,
} from "./types.js";
import {
  CHITKING_CONFIG_TEMPLATE,
  CHITKING_WORKFLOW_SKILL,
  COMMANDS_DIR,
  CODEX_CONFIG_TEMPLATE,
  CODEX_DIR,
  OPENCODE_CHITKING_CONTEXT_PLUGIN,
  OPENCODE_PLUGINS_DIR,
  SKILLS_DIR,
  ensureDir,
  getChitkingRuntimeTemplateFilePath,
  getChitkingSkillsDir,
  getChitkingWorkflowSkillPath,
  getCodexCommandSkillDir,
  getCodexCommandSkillPath,
  getCodexConfigPath,
  getCodexSkillsDir,
  getOpenCodeAdapterPath,
  getOpenCodeAgentsDir,
  getOpenCodeChitkingContextPluginPath,
  getOpenCodeChitkingWorkflowSkillDir,
  getOpenCodeChitkingWorkflowSkillPath,
  getOpenCodeCommandsDir,
  getOpenCodeCommandPath,
  getOpenCodePluginsDir,
  getRoleContractPath,
  getRolesDir,
  writeFileIfMissing,
} from "./utils.js";
import {
  getCodexTemplatePath,
  getOpenCodeTemplatePath,
} from "../templates/extract.js";

export function defaultConfigTemplateContent(): string {
  return fs.readFileSync(
    getChitkingRuntimeTemplateFilePath(CHITKING_CONFIG_TEMPLATE),
    "utf-8",
  );
}

export function commandTemplateContent(command: CkCommand): string {
  return fs.readFileSync(
    getChitkingRuntimeTemplateFilePath(COMMANDS_DIR, `${command}.md`),
    "utf-8",
  );
}

export function openCodeCommandContent(
  command: CkCommand,
  commandContent: string,
): string {
  return `---
description: ${CK_COMMAND_DESCRIPTIONS[command]}
---

${commandContent}`;
}

export function codexCommandSkillContent(
  command: CkCommand,
  commandContent: string,
): string {
  return `---
name: ${command}
description: ${CK_COMMAND_DESCRIPTIONS[command]}
---

${commandContent}`;
}

export function codexConfigTemplateContent(): string {
  return fs.readFileSync(
    path.join(getCodexTemplatePath(), CODEX_CONFIG_TEMPLATE),
    "utf-8",
  );
}

export function roleTitle(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function defaultRoleContractContent(
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

export function dreamerRoleContractContent(role: RoleDefinition): string {
  const warnings = role.warnings.map((warning) => `- ${warning}`).join("\n");
  const stopConditions = role.prompt.stop_conditions
    .map((condition) => `- ${condition}`)
    .join("\n");

  return `# Chitking Dreamer Role\n\n## Objective\n\n${role.prompt.objective}\n\n## Required Inputs\n\n- Theory brief.\n- Open questions.\n- Constraints and non-goals.\n- Unresolved objections.\n- Failed paths.\n- The current per-thread packet from \`chitking dispatch --role dreamer\`.\n\n## Output Shape\n\nProduce bounded ideation candidates, not an implementation plan:\n\n- Hypotheses that may explain the current capability gap.\n- Strange analogies that could reveal hidden structure.\n- Candidate mechanisms worth investigating.\n- Edge cases and failure modes that stress the theory.\n- Possible theory directions that require review before adoption.\n\n## Hard Boundaries\n\n- Do not create implementation tasks.\n- Do not assign work to build, Executor, or any implementation role.\n- Do not hand Dreamer output directly to build or Executor.\n- Do not present ideation as approved next safe action.\n- Route candidates through human, oracle, or planner review before they can become implementation work.\n\n## Warnings\n\n${warnings}\n\n## Stop Conditions\n\n${stopConditions}\n`;
}

export function opencodePermissionsForRole(
  roleName: string,
): OpenCodePermissions {
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

export function opencodeAdapterContent(
  roleName: string,
  role: RoleDefinition,
  contractContent: string,
): string {
  const permission = opencodePermissionsForRole(roleName);
  const dreamerBoundary =
    roleName === "dreamer"
      ? "\nDreamer-specific boundary: OpenCode `edit: deny` blocks write/edit/patch tools. Do not create implementation tasks, call build/Executor directly, or present ideation as approved implementation work.\n"
      : "";
  return `---\ndescription: |\n  Chitking ${roleTitle(roleName)} adapter with embedded canonical role contract.\nmode: subagent\npermission:\n  read: ${permission.read}\n  edit: ${permission.edit}\n  bash: ${permission.bash}\n  glob: ${permission.glob}\n  grep: ${permission.grep}\n  list: ${permission.list}\n  task: ${permission.task}\n---\n# Chitking ${roleTitle(roleName)} Adapter\n\nYou are the Chitking \`${roleName}\` role adapter for OpenCode.\n\nUse the active thread packet generated by:\n\n- \`chitking dispatch --role ${roleName}\`\n\nRole objective summary:\n\n${role.prompt.objective}${dreamerBoundary}\n## Embedded Canonical Role Contract\n\n${contractContent}`;
}

export function chitkingWorkflowSkillContent(): string {
  return fs.readFileSync(
    getChitkingRuntimeTemplateFilePath(
      SKILLS_DIR,
      `${CHITKING_WORKFLOW_SKILL}.md`,
    ),
    "utf-8",
  );
}

export function opencodeChitkingWorkflowSkillContent(
  canonicalContent: string,
): string {
  return `---\nname: chitking-workflow\ndescription: Trigger when working in a Chitking repo, using chitking commands, interpreting Chitking workflow/state files, or handling research threads, stage, maturity, readiness, roles, or generated packets.\n---\n${canonicalContent}`;
}

export function defaultProjectContent(): string {
  return `# Research Project Context\n\n## Research Domain\nTODO: describe the domain this repository studies.\n\n## Core Theoretical Commitments\nTODO: list the commitments that should remain stable across threads.\n\n## Modeling Assumptions\nTODO: capture assumptions agents should not silently change.\n\n## Verification Standards\nTODO: define what counts as evidence.\n\n## Code/Experiment Norms\nTODO: describe repository-specific implementation and experiment norms.\n\n## Non-Goals\nTODO: list work this research harness should not pursue.\n`;
}

export function defaultThreadBody(): string {
  return REQUIRED_THREAD_SECTIONS.map((section) => `## ${section}\n`).join(
    "\n",
  );
}

export function ensureOpenCodeChitkingContextPlugin(cwd: string): void {
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

export function ensureSlashCommands(cwd: string): void {
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

export function ensureChitkingWorkflowSkill(cwd: string): void {
  ensureDir(getChitkingSkillsDir(cwd));
  ensureDir(getOpenCodeChitkingWorkflowSkillDir(cwd));
  const canonicalContent = chitkingWorkflowSkillContent();
  writeFileIfMissing(getChitkingWorkflowSkillPath(cwd), canonicalContent);
  writeFileIfMissing(
    getOpenCodeChitkingWorkflowSkillPath(cwd),
    opencodeChitkingWorkflowSkillContent(canonicalContent),
  );
}

export function ensureRoleHarness(cwd: string, config: ResearchConfig): void {
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
