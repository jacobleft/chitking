import { Command } from "commander";
import { pathToFileURL } from "node:url";
import chalk from "chalk";

import {
  chitkingArchive,
  chitkingDelete,
  chitkingFocus,
  chitkingInit,
  chitkingList,
  chitkingNew,
  chitkingOrient,
  chitkingPack,
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
    .description(
      "Initialize Chitking scaffold in the current repository",
    )
    .action(() => runWithErrors(() => chitkingInit()));

  program
    .command("new")
    .description("Create and focus a new research thread")
    .argument("<title>", "Thread title")
    .option("--slug <slug>", "Override generated slug")
    .action((title: string, options: { slug?: string }) =>
      runWithErrors(() => chitkingNew(title, options)),
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
    .action((activeThread: string) =>
      runWithErrors(() => chitkingFocus(activeThread)),
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
    .action((thread: string) =>
      runWithErrors(() => chitkingRestore(thread)),
    );

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
    .command("step")
    .description("Move maturity/readiness with explicit human consent")
    .option("--to <maturity>", "Explicit target maturity")
    .option("--readiness <0-5>", "Set readiness score", parseReadiness)
    .option("--reason <text>", "Required reason for explicit --to moves")
    .action((options: { to?: string; readiness?: number; reason?: string }) =>
      runWithErrors(() => chitkingStep(options)),
    );

  program
    .command("pack")
    .description("Generate a role prompt packet for the active thread")
    .requiredOption(
      "--role <role>",
      "Role: plan, build, verify, synthesize, review, oracle",
    )
    .action((options: { role: string }) =>
      runWithErrors(() => chitkingPack(options)),
    );

  program
    .command("record")
    .description("Agent utility: append factual role output to the active thread")
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
