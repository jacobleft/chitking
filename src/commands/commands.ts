import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { stringify } from "yaml";
import {
  RECORD_SECTION_BY_TYPE,
  type AssessCriterion,
  type ChitkingStatus,
  type ConfirmationOptions,
  type DispatchOptions,
  type FocusOptions,
  type GitSnapshot,
  type MatureOptions,
  type NewThreadOptions,
  type ParsedThread,
  type RecordOptions,
  type RecordType,
  type ResearchConfig,
  type RoleDefinition,
  type StepOptions,
} from "./types.js";
import {
  CONTEXT_IGNORE_PATTERN,
  ensureDir,
  getActivePath,
  getChitkingDir,
  getConfigPath,
  getContextDir,
  getContextPath,
  getProjectPath,
  getResearchDir,
  getThreadDir,
  getThreadPath,
  isOrientHousekeepingStatus,
  nowIso,
  readYamlRecord,
  toRepoPath,
  writeFileIfMissing,
  writeYamlFile,
} from "./utils.js";
import {
  appendToSection,
  clearActiveThreadIfMatches,
  ensureThreadSections,
  extractSectionBody,
  formatThreadSummary,
  isThreadArchived,
  listThreadSummaries,
  loadConfig,
  readActiveThreadOrNull,
  readThread,
  readUsableActiveThreadOrNull,
  requireThreadNotArchived,
  resolveActiveThread,
  resolveActiveThreadReadOnly,
  slugifyTitle,
  validateReadiness,
  validateSlug,
  writeActiveState,
  writeThread,
} from "./config.js";
import {
  defaultConfigTemplateContent,
  defaultProjectContent,
  defaultThreadBody,
  ensureChitkingWorkflowSkill,
  ensureOpenCodeChitkingContextPlugin,
  ensureRoleHarness,
  ensureSlashCommands,
} from "./templates.js";

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

function formatStageProgression(
  stages: string[],
  currentStage: string,
): string {
  return (
    stages.map((s) => (s === currentStage ? `[${s}]` : s)).join(" → ") +
    " → (loop)"
  );
}

function formatReadinessLine(
  thread: { stage: string; readiness: number },
  config: ResearchConfig,
): string {
  const stageIndex = config.stages.indexOf(thread.stage);
  const readiness = thread.readiness;

  if (stageIndex === -1 || config.stages.length === 0) {
    return `Readiness: ${readiness}/5`;
  }

  const isFinalStage = stageIndex === config.stages.length - 1;
  const nextStage = isFinalStage
    ? config.stages[0]
    : config.stages[stageIndex + 1];
  const threshold = config.stage_advancement[thread.stage] ?? 0;

  if (isFinalStage) {
    return `Readiness: ${readiness}/5 — ready to loop back to ${nextStage} ✓`;
  }

  const isReady = readiness >= threshold;
  return `Readiness: ${readiness}/5 — need ≥${threshold} to advance to ${nextStage} ${isReady ? "✓ ready" : "✗ not ready"}`;
}

export function evaluateCriterion(
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

export function resolveCommit(cwd: string, ref: string): string | null {
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

export function readGitSnapshot(cwd: string): GitSnapshot {
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

export function roleRiskWarnings(
  role: RoleDefinition,
  config: ResearchConfig,
  thread: { stage: string; readiness: number },
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

export function findStalePackets(
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

export function projectLooksIncomplete(
  projectContent: string,
  config: ResearchConfig,
): boolean {
  return config.project_incomplete_markers.some((marker) =>
    projectContent.includes(marker),
  );
}

export function buildRolePacket(
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
      record_prediction: 'chitking record --type prediction --text "..."',
    },
  };
  writeYamlFile(packetPath, packet);
  return toRepoPath(cwd, packetPath);
}

export function autoDispatch(
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
    throw new Error(
      "research/project.md is required. Run chitking init first.",
    );
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
  const config = loadConfig(cwd);
  const slug = thread ? validateSlug(thread) : resolveActiveThread(cwd);
  const parsedThread = readThread(cwd, slug);
  const lines = [
    `Thread: ${slug}`,
    `Title: ${parsedThread.frontmatter.title}`,
    "",
    `Stages: ${formatStageProgression(config.stages, parsedThread.frontmatter.stage)}`,
    formatReadinessLine(parsedThread.frontmatter, config),
    `Maturity: ${parsedThread.frontmatter.maturity}`,
    "",
    `Archived: ${isThreadArchived(parsedThread) ? "yes" : "no"} | Updated: ${parsedThread.frontmatter.updated_at}`,
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
    throw new Error(
      "chitking focus requires <thread>. Use chitking show or chitking list.",
    );
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
  const currentIndex = config.stages.indexOf(thread.frontmatter.stage);
  const nextStage =
    currentIndex >= 0 && currentIndex < config.stages.length - 1
      ? config.stages[currentIndex + 1]
      : config.stages[0];

  const issues: string[] = [];
  if (!projectContent) issues.push("research/project.md is missing or empty.");
  if (projectLooksIncomplete(projectContent, config)) {
    issues.push("research/project.md appears incomplete.");
  }
  for (const section of missingSections) {
    issues.push(`thread.md missing required section: ${section}`);
  }
  if (git.dirty.length > 0) {
    issues.push("Dirty working tree may contain unrecorded thread progress.");
  }
  if (unrecordedCommits.length > 0) {
    issues.push(
      "Recent repository commits are not listed in recorded_commits.",
    );
  }
  for (const packet of stalePackets) {
    issues.push(`Generated context packet may be stale: ${packet}`);
  }

  const lines = [
    `Thread: ${slug}`,
    `Title: ${thread.frontmatter.title}`,
    "",
    `Stages: ${formatStageProgression(config.stages, thread.frontmatter.stage)}`,
    formatReadinessLine(thread.frontmatter, config),
    `Maturity: ${thread.frontmatter.maturity} (whole-thread quality)`,
    "",
    "Issues:",
  ];
  if (issues.length === 0) {
    lines.push("None.");
  } else {
    for (const issue of issues) {
      lines.push(`- ${issue}`);
    }
  }

  lines.push(
    "",
    "Next steps:",
    "- chitking assess — evaluate content against stage criteria",
    `- chitking step --to ${nextStage} --reason "..." — advance to next stage`,
    "- chitking dispatch — refresh role packets",
    '- chitking record --type failure --text "..." — record a failed path',
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
      lines.push(
        `  ${result.passed ? "✓" : "✗"} ${sectionName}: ${result.detail}`,
      );
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
        `→ To apply: chitking mature --to ${recommend} --reason "..."`,
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
    throw new Error(
      "research/project.md is required. Run chitking init first.",
    );
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
  const isLoopBack = !targetStage && stageIndex === config.stages.length - 1;
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
    targetStage = isLoopBack ? config.stages[0] : config.stages[stageIndex + 1];
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

export function chitkingMature(
  options: MatureOptions,
  cwd: string = process.cwd(),
): void {
  const config = loadConfig(cwd);
  const slug = resolveActiveThread(cwd);
  const thread = readThread(cwd, slug);

  if (!options.reason || options.reason.trim().length === 0) {
    throw new Error("chitking mature requires --reason.");
  }
  if (!config.maturity_levels.includes(options.to)) {
    throw new Error(`Unknown maturity level: ${options.to}`);
  }

  const previousMaturity = thread.frontmatter.maturity;
  thread.frontmatter.maturity = options.to;
  thread.frontmatter.updated_at = nowIso();

  thread.body = appendToSection(
    thread.body,
    "Decisions & Maturity History",
    `maturity ${previousMaturity}→${options.to}. Reason: ${options.reason.trim()}`,
  );

  writeThread(cwd, slug, thread);
  console.log(`Maturity updated: ${slug} ${previousMaturity} → ${options.to}`);

  if (!options.noDispatch) {
    autoDispatch(cwd, slug, config);
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
