import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE_ROOT = "src";
const PRODUCTION_EXTENSIONS = new Set([".ts", ".tsx"]);
const CONSOLE_PATTERN = /console\.(log|debug|info|warn|error)\(/;
const DANGEROUS_JS_PATTERN =
  /dangerouslySetInnerHTML|eval\(|new Function\(|setTimeout\(\s*["']|setInterval\(\s*["']/;
const SERVER_FETCH_PATTERN = /fetch\(/;
const STRUCTURED_LOGGER_PATH = "src/lib/observability/logger.ts";
const BROWSER_API_CLIENT_PATH = "src/lib/api/client.ts";

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) return collectSourceFiles(path);

    const extension = path.endsWith(".tsx")
      ? ".tsx"
      : path.endsWith(".ts")
        ? ".ts"
        : "";

    return PRODUCTION_EXTENSIONS.has(extension) ? [path] : [];
  });
}

function toProjectPath(path: string): string {
  return relative(process.cwd(), path);
}

describe("final security audit regression guards", () => {
  const sourceFiles = collectSourceFiles(SOURCE_ROOT);

  it("should keep production source free of direct console usage outside the structured logger", () => {
    const offenders = sourceFiles
      .map((path) => ({
        path: toProjectPath(path),
        source: readFileSync(path, "utf8"),
      }))
      .filter(({ path, source }) =>
        path !== STRUCTURED_LOGGER_PATH && CONSOLE_PATTERN.test(source),
      )
      .map(({ path }) => path);

    expect(offenders).toEqual([]);
  });

  it("should not add dangerous HTML or string-evaluation sinks", () => {
    const offenders = sourceFiles
      .map((path) => ({
        path: toProjectPath(path),
        source: readFileSync(path, "utf8"),
      }))
      .filter(({ source }) => DANGEROUS_JS_PATTERN.test(source))
      .map(({ path }) => path);

    expect(offenders).toEqual([]);
  });

  it("should keep server-side source free of unreviewed fetch calls", () => {
    const serverFiles = sourceFiles.filter((path) => {
      const projectPath = toProjectPath(path);
      return (
        (projectPath.startsWith("src/app/api/") ||
          projectPath.startsWith("src/lib/")) &&
        projectPath !== BROWSER_API_CLIENT_PATH
      );
    });
    const offenders = serverFiles
      .map((path) => ({
        path: toProjectPath(path),
        source: readFileSync(path, "utf8"),
      }))
      .filter(({ source }) => SERVER_FETCH_PATTERN.test(source))
      .map(({ path }) => path);

    expect(offenders).toEqual([]);
  });

  it("should keep the final security audit document in the planning artifacts", () => {
    expect(
      existsSync("_bmad-output/planning-artifacts/security-audit-2026-05-09.md"),
    ).toBe(true);
  });
});
