import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getAllApiEndpoints } from "../../src/lib/api-docs/spec";

const routeMethodPattern =
  /export\s+async\s+function\s+(GET|POST|PATCH|DELETE|PUT|HEAD|OPTIONS)\b/g;

function findRouteFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = path.join(directory, entry);
    if (statSync(fullPath).isDirectory()) return findRouteFiles(fullPath);
    return entry === "route.ts" ? [fullPath] : [];
  });
}

function routeFileToApiPath(filePath: string, apiRoot: string): string {
  const relativePath = path.relative(apiRoot, filePath).replace(/\/route\.ts$/, "");
  const segments = relativePath.split(path.sep).map((segment) =>
    segment.replace(/^\[(.+)\]$/, "{$1}"),
  );

  return `/api/v1/${segments.join("/")}`;
}

function getImplementedApiOperations(): string[] {
  const apiRoot = path.resolve(process.cwd(), "src/app/api/v1");

  return findRouteFiles(apiRoot).flatMap((filePath) => {
    const source = readFileSync(filePath, "utf8");
    const routePath = routeFileToApiPath(filePath, apiRoot);
    const operations = Array.from(source.matchAll(routeMethodPattern)).map(
      (match) => `${match[1]} ${routePath}`,
    );

    return operations;
  });
}

describe("API docs completeness", () => {
  it("should document every implemented v1 route when route handlers exist", () => {
    const documented = new Set(
      getAllApiEndpoints().map((endpoint) => `${endpoint.method} ${endpoint.path}`),
    );

    for (const operation of getImplementedApiOperations()) {
      expect(documented.has(operation), `${operation} is missing from API docs`).toBe(
        true,
      );
    }
  });
});
