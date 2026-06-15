export const CK_COMMANDS = [
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
  "ck-mature",
] as const;

export type CkCommand = (typeof CK_COMMANDS)[number];

export const CK_COMMAND_DESCRIPTIONS: Record<CkCommand, string> = {
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
  "ck-dispatch": "Generate Chitking role prompt packets for the active thread.",
  "ck-record":
    "Append factual role output to the active Chitking research thread when asked.",
  "ck-assess":
    "Heuristic content evaluation that recommends but does not apply stage/readiness changes.",
  "ck-iterate":
    "Archive the active thread and create a new thread with a predecessor link.",
  "ck-mature": "Update whole-thread maturity only with explicit human consent.",
  "ck-step": "Move Chitking stage/readiness only with explicit human consent.",
};

export const REQUIRED_THREAD_SECTIONS = [
  "Theory Brief",
  "Current Claim",
  "Capability Gap",
  "Verification Obligations",
  "Evidence",
  "Failed Paths",
  "Next Safe Actions",
  "Decisions & Maturity History",
] as const;

export const RECORD_SECTION_BY_TYPE = {
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

export interface MatureOptions {
  to: string;
  reason: string;
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

export interface RolePrompt {
  objective: string;
  stop_conditions: string[];
}

export interface RoleDefinition {
  prompt: RolePrompt;
  min_stage?: string;
  min_readiness?: number;
  warnings: string[];
}

export interface OpenCodePermissions {
  read: "allow" | "deny";
  edit: "allow" | "deny";
  bash: "allow" | "deny";
  glob: "allow" | "deny";
  grep: "allow" | "deny";
  list: "allow" | "deny";
  task: "allow" | "deny";
}

export interface ResearchConfig {
  schema_version: number;
  stages: string[];
  stage_advancement: Record<string, number>;
  maturity_levels: string[];
  stage_criteria: Record<string, AssessCriterion[]>;
  maturity_criteria: Record<string, AssessCriterion[]>;
  roles: Record<string, RoleDefinition>;
  project_incomplete_markers: string[];
}

export interface ThreadFrontmatter {
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

export interface ParsedThread {
  frontmatter: ThreadFrontmatter;
  body: string;
}

export interface ActiveState {
  active_thread: string | null;
  updated_at: string;
}

export interface GitSnapshot {
  dirty: string[];
  recentCommits: string[];
}

export interface ThreadSummary {
  slug: string;
  title: string;
  stage: string;
  maturity: string;
  readiness: number;
  archived: boolean;
  updatedAt: string;
}

export interface ChitkingStatus {
  productName: string;
  chineseName: string;
  behaviorMigrated: boolean;
  message: string;
}
