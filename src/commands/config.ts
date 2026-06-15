import fs from "node:fs";
import { parse, stringify } from "yaml";
import { defaultConfigTemplateContent } from "./templates.js";
import {
  getActivePath,
  getConfigPath,
  getResearchDir,
  getThreadPath,
  isRecord,
  nowIso,
  readYamlRecord,
  writeYamlFile,
} from "./utils.js";
import {
  REQUIRED_THREAD_SECTIONS,
  type ActiveState,
  type AssessCriterion,
  type ParsedThread,
  type ResearchConfig,
  type RoleDefinition,
  type ThreadFrontmatter,
  type ThreadSummary,
} from "./types.js";

export function normalizeConfig(
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

export function parseAssessCriterion(raw: unknown): AssessCriterion {
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

export function parseAssessCriteria(
  raw: unknown,
): Record<string, AssessCriterion[]> {
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

export function defaultConfig(): ResearchConfig {
  const raw = parse(defaultConfigTemplateContent()) as unknown;
  if (!isRecord(raw)) {
    throw new Error(
      "Chitking default config template must contain a YAML mapping",
    );
  }
  return normalizeConfig(raw, undefined);
}

export function loadConfig(cwd: string): ResearchConfig {
  const configPath = getConfigPath(cwd);
  if (!fs.existsSync(configPath)) {
    throw new Error("Run chitking init before using Chitking commands.");
  }

  const raw = readYamlRecord(configPath);
  const defaults = defaultConfig();
  return normalizeConfig(raw, defaults);
}

export function parseRoles(
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

export function parseActiveState(cwd: string): ActiveState {
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

export function writeActiveState(cwd: string, slug: string | null): void {
  writeYamlFile(getActivePath(cwd), {
    active_thread: slug,
    updated_at: nowIso(),
  });
}

export function readActiveThreadOrNull(cwd: string): string | null {
  if (!fs.existsSync(getActivePath(cwd))) {
    return null;
  }
  return parseActiveState(cwd).active_thread;
}

export function clearActiveThreadIfMatches(cwd: string, slug: string): void {
  if (readActiveThreadOrNull(cwd) === slug) {
    writeActiveState(cwd, null);
  }
}

export function readUsableActiveThreadOrNull(cwd: string): string | null {
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

export function resolveActiveThread(cwd: string): string {
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

export function resolveActiveThreadReadOnly(cwd: string): string {
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

export function slugifyTitle(title: string): string {
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

export function validateSlug(slug: string): string {
  const normalized = slugifyTitle(slug);
  if (normalized !== slug) {
    throw new Error(
      `Invalid slug "${slug}". Use lowercase letters, numbers, and hyphens.`,
    );
  }
  return normalized;
}

export function readStageAndMaturity(raw: Record<string, unknown>): {
  stage: string;
  maturity: string;
} {
  const stageValue =
    typeof raw.stage === "string" && raw.stage.length > 0 ? raw.stage : null;
  const legacyMaturityValue =
    typeof raw.maturity === "string" && raw.maturity.length > 0
      ? raw.maturity
      : null;

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

export function parseThreadContent(content: string): ParsedThread {
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

export function isThreadArchived(thread: ParsedThread): boolean {
  return thread.frontmatter.archived === true;
}

export function stringField(
  raw: Record<string, unknown>,
  field: string,
): string {
  const value = raw[field];
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  throw new Error(
    `thread.md frontmatter missing required string field: ${field}`,
  );
}

export function formatThreadContent(thread: ParsedThread): string {
  return `---\n${stringify(thread.frontmatter).trimEnd()}\n---\n${thread.body}`;
}

export function readThread(cwd: string, slug: string): ParsedThread {
  const threadPath = getThreadPath(cwd, slug);
  if (!fs.existsSync(threadPath)) {
    throw new Error(`Thread not found: ${slug}`);
  }
  return parseThreadContent(fs.readFileSync(threadPath, "utf-8"));
}

export function writeThread(
  cwd: string,
  slug: string,
  thread: ParsedThread,
): void {
  fs.writeFileSync(
    getThreadPath(cwd, slug),
    formatThreadContent(thread),
    "utf-8",
  );
}

export function requireThreadNotArchived(
  slug: string,
  thread: ParsedThread,
): void {
  if (isThreadArchived(thread)) {
    throw new Error(
      `Thread is archived: ${slug}. Run chitking restore ${slug} first.`,
    );
  }
}

export function listThreadSummaries(
  cwd: string,
  includeArchived = false,
): ThreadSummary[] {
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

export function formatThreadSummary(
  summary: ThreadSummary,
  activeThread: string | null,
): string {
  const activeText = summary.slug === activeThread ? " [active]" : "";
  const archivedText = summary.archived ? " [archived]" : "";
  return `- ${summary.slug} — ${summary.title} (${summary.stage}, readiness ${summary.readiness})${activeText}${archivedText}`;
}

export function ensureThreadSections(body: string): string[] {
  return REQUIRED_THREAD_SECTIONS.filter(
    (section) => !body.includes(`## ${section}`),
  );
}

export function appendToSection(
  body: string,
  section: string,
  text: string,
): string {
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

export function extractSectionBody(body: string, section: string): string {
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

export function validateReadiness(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 5) {
    throw new Error("Readiness must be an integer from 0 to 5.");
  }
  return value;
}
