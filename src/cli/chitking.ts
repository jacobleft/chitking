import { Command } from "commander";
import { pathToFileURL } from "node:url";
import path from "node:path";
import chalk from "chalk";

import { chitkingInit, formatChitkingStatus } from "../commands/chitking.js";
import { PRODUCT_DESCRIPTION, VERSION } from "../constants.js";

export interface ChitkingProgramOptions {
  name?: string;
}

export function createChitkingProgram(
  options: ChitkingProgramOptions = {},
): Command {
  const program = new Command();
  const programName = options.name ?? "chitking";

  program
    .name(programName)
    .description(PRODUCT_DESCRIPTION)
    .version(VERSION, "-v, --version")
    .option("--status", "show current Chitking migration status")
    .action((options: { status?: boolean }) => {
      if (options.status === true) {
        console.log(formatChitkingStatus());
      }
    });

  program
    .command("init")
    .description(
      "Initialize Research Trellis scaffold in the current repository",
    )
    .action(() => runWithErrors(() => chitkingInit()));

  program.addHelpText(
    "after",
    "\nChitking means 哲徑: a path for reflective research. This bridge release preserves RT scaffold names while migration continues.",
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
  const programName =
    argv[1] !== undefined ? path.basename(argv[1], ".js") : "chitking";
  createChitkingProgram({ name: programName }).parse(argv);
}

const isDirectEntrypoint =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectEntrypoint) {
  run();
}
