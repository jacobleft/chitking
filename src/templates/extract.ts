import path from "node:path";
import { fileURLToPath } from "node:url";

export function getTemplateRootPath(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, "..", "templates");
}

export function getChitkingTemplatePath(...segments: string[]): string {
  return path.join(getTemplateRootPath(), "chitking", ...segments);
}

export function getChitkingRuntimeTemplatePath(...segments: string[]): string {
  return path.join(getTemplateRootPath(), "chitking", ...segments);
}

export function getOpenCodeTemplatePath(...segments: string[]): string {
  return path.join(getTemplateRootPath(), "opencode", ...segments);
}
