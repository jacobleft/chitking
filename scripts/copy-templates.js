import { cpSync, existsSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(packageRoot, "src", "templates");
const destination = path.join(packageRoot, "dist", "templates");

if (existsSync(source)) {
  if (existsSync(destination)) {
    for (const entry of readdirSync(destination, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (!existsSync(path.join(source, entry.name))) {
        rmSync(path.join(destination, entry.name), { recursive: true, force: true });
      }
    }
  }

  for (const entry of readdirSync(source, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const target = path.join(destination, entry.name);
    rmSync(target, { recursive: true, force: true });
    cpSync(path.join(source, entry.name), target, { recursive: true });
  }
}
