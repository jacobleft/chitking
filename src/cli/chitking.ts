import { Command } from "commander";
import { pathToFileURL } from "node:url";
import chalk from "chalk";

import {
  chitkingArchive,
  chitkingAssess,
  chitkingDelete,
  chitkingDispatch,
  chitkingFocus,
  chitkingInit,
  chitkingIterate,
  chitkingList,
  chitkingMature,
  chitkingNew,
  chitkingOrient,
  chitkingRecord,
  chitkingRename,
  chitkingRestore,
  chitkingShow,
  chitkingStep,
  formatChitkingStatus,
  parseRecordType,
} from "../commands/chitking.js";
import { PRODUCT_DESCRIPTION, VERSION } from "../constants.js";

function parseReadiness(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 5) {
    throw new Error("Readiness must be an integer from 0 to 5.");
  }
  return parsed;
}

/**
 * Commander exposes `--no-dispatch` as `options.dispatch = false` (default
 * `true`). Command functions expect `{ noDispatch: true }`. Translate at the
 * CLI adapter boundary so the public command API stays stable.
 */
function withNoDispatch<T extends { dispatch?: boolean }>(
  options: T,
): { noDispatch?: boolean } {
  return options.dispatch === false ? { noDispatch: true } : {};
}

export function createChitkingProgram(): Command {
  const program = new Command();

  program
    .name("chitking")
    .description(PRODUCT_DESCRIPTION)
    .version(VERSION, "-v, --version")
    .option("--status", "show current Chitking migration status")
    .action((options: { status?: boolean }) => {
      if (options.status === true) {
        console.log(formatChitkingStatus());
      }
    });
  program.allowExcessArguments(false);

  program
    .command("init")
    .description("Initialize Chitking scaffold in the current repository")
    .option("--no-dispatch", "Skip auto-dispatch of role packets")
    .allowExcessArguments(false)
    .action((options: { dispatch?: boolean }) =>
      runWithErrors(() => chitkingInit(process.cwd(), withNoDispatch(options))),
    );

  program
    .command("new")
    .description("Create and focus a new research thread")
    .argument("<title>", "Thread title")
    .option("--slug <slug>", "Override generated slug")
    .option("--no-dispatch", "Skip auto-dispatch of role packets")
    .allowExcessArguments(false)
    .action((title: string, options: { slug?: string; dispatch?: boolean }) =>
      runWithErrors(() =>
        chitkingNew(title, { slug: options.slug, ...withNoDispatch(options) }),
      ),
    );

  program
    .command("list")
    .description("List non-archived research threads")
    .action(() => runWithErrors(() => chitkingList()));

  program
    .command("show")
    .description("Show a research thread summary")
    .argument("[thread]", "Thread slug to show; defaults to active thread")
    .action((thread?: string) => runWithErrors(() => chitkingShow(thread)));

  program
    .command("focus")
    .description("Set the active research thread")
    .argument("<thread>", "Thread slug to focus")
    .option("--no-dispatch", "Skip auto-dispatch of role packets")
    .allowExcessArguments(false)
    .action((activeThread: string, options: { dispatch?: boolean }) =>
      runWithErrors(() => chitkingFocus(activeThread, withNoDispatch(options))),
    );

  program
    .command("rename")
    .description("Rename a research thread without changing its slug")
    .argument("<thread>", "Thread slug to rename")
    .argument("<title>", "New human-readable thread title")
    .action((thread: string, title: string) =>
      runWithErrors(() => chitkingRename(thread, title)),
    );

  program
    .command("archive")
    .description("Archive a research thread")
    .argument("<thread>", "Thread slug to archive")
    .option("--yes", "Confirm archival")
    .action((thread: string, options: { yes?: boolean }) =>
      runWithErrors(() => chitkingArchive(thread, options)),
    );

  program
    .command("restore")
    .description("Restore an archived research thread")
    .argument("<thread>", "Thread slug to restore")
    .action((thread: string) => runWithErrors(() => chitkingRestore(thread)));

  program
    .command("delete")
    .description("Delete a research thread directory")
    .argument("<thread>", "Thread slug to delete")
    .option("--yes", "Confirm deletion")
    .action((thread: string, options: { yes?: boolean }) =>
      runWithErrors(() => chitkingDelete(thread, options)),
    );

  program
    .command("orient")
    .description("Print the human checkpoint for the active research thread")
    .action(() => runWithErrors(() => chitkingOrient()));

  program
    .command("assess")
    .description("Heuristic content evaluation for the active thread")
    .argument("[thread]", "Thread slug to assess; defaults to active thread")
    .action((thread?: string) => runWithErrors(() => chitkingAssess(thread)));

  program
    .command("step")
    .description("Move stage/readiness with explicit human consent")
    .option("--to <stage>", "Explicit target stage")
    .option("--readiness <0-5>", "Set readiness score", parseReadiness)
    .option("--reason <text>", "Required reason for explicit --to moves")
    .option("--no-dispatch", "Skip auto-dispatch of role packets")
    .allowExcessArguments(false)
    .action(
      (options: {
        to?: string;
        readiness?: number;
        reason?: string;
        dispatch?: boolean;
      }) =>
        runWithErrors(() =>
          chitkingStep({
            to: options.to,
            readiness: options.readiness,
            reason: options.reason,
            ...withNoDispatch(options),
          }),
        ),
    );

  program
    .command("mature")
    .description("Update whole-thread maturity with explicit human consent")
    .requiredOption(
      "--to <level>",
      "Target maturity level (nascent, developing, established, mature)",
    )
    .requiredOption(
      "--reason <text>",
      "Required reason for the maturity change",
    )
    .option("--no-dispatch", "Skip auto-dispatch of role packets")
    .allowExcessArguments(false)
    .action((options: { to: string; reason: string; dispatch?: boolean }) =>
      runWithErrors(() =>
        chitkingMature({
          to: options.to,
          reason: options.reason,
          ...withNoDispatch(options),
        }),
      ),
    );

  program
    .command("dispatch")
    .description("Generate role prompt packets for the active thread")
    .option(
      "--role <role>",
      "Dispatch a single role; omit to dispatch all roles (plan, dreamer, build, verify, synthesize, review, oracle)",
    )
    .action((options: { role?: string }) =>
      runWithErrors(() => chitkingDispatch(options)),
    );

  program
    .command("record")
    .description(
      "Agent utility: append factual role output to the active thread",
    )
    .requiredOption(
      "--type <type>",
      "Record type: evidence, failure, decision, revision",
      parseRecordType,
    )
    .option("--commit <ref>", "Resolve and add commit hash to recorded_commits")
    .requiredOption("--text <text>", "Factual text to append")
    .action(
      (options: {
        type: "evidence" | "failure" | "decision" | "revision";
        commit?: string;
        text: string;
      }) => runWithErrors(() => chitkingRecord(options)),
    );

  program
    .command("iterate")
    .description("Archive the active thread and create a new successor thread")
    .argument("<title>", "Title for the new thread")
    .option("--slug <slug>", "Override generated slug")
    .option("--no-dispatch", "Skip auto-dispatch of role packets")
    .allowExcessArguments(false)
    .action((title: string, options: { slug?: string; dispatch?: boolean }) =>
      runWithErrors(() =>
        chitkingIterate(title, {
          slug: options.slug,
          ...withNoDispatch(options),
        }),
      ),
    );

  program.addHelpText(
    "after",
    "\nChitking means 哲徑: a path for reflective research.",
  );

  return program;
}

function runWithErrors(action: () => void): void {
  try {
    action();
  } catch (error) {
    console.error(
      chalk.red("Error:"),
      error instanceof Error ? error.message : error,
    );
    if (process.env.DEBUG || process.env.TRELLIS_DEBUG) {
      console.error(error instanceof Error ? error.stack : error);
    }
    process.exit(1);
  }
}

export function run(argv: readonly string[] = process.argv): void {
  createChitkingProgram().parse(argv);
}

const isDirectEntrypoint =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectEntrypoint) {
  run();
}
