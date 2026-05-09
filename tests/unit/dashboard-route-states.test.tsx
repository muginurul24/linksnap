import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DashboardRouteErrorState } from "../../src/components/dashboard/route-error-state";

const dashboardRoot = join(process.cwd(), "src", "app", "(dashboard)");

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);

    return stat.isDirectory() ? listFiles(path) : [path];
  });
}

describe("dashboard route states", () => {
  it("should provide loading and error boundaries for every dashboard page", () => {
    const pageFiles = listFiles(dashboardRoot).filter((file) =>
      file.endsWith("/page.tsx"),
    );

    const missing = pageFiles.flatMap((pageFile) => {
      const dir = pageFile.slice(0, -"/page.tsx".length);
      const absent = ["loading.tsx", "error.tsx"].filter(
        (filename) => !existsSync(join(dir, filename)),
      );

      return absent.map((filename) => `${dir}/${filename}`);
    });

    expect(missing).toEqual([]);
  });

  it("should use the standard dashboard error state for route errors", () => {
    const errorFiles = listFiles(dashboardRoot).filter((file) =>
      file.endsWith("/error.tsx"),
    );
    const nonStandard = errorFiles.filter((file) => {
      const source = readFileSync(file, "utf8");

      return !source.includes("DashboardRouteErrorState");
    });

    expect(nonStandard).toEqual([]);
  });

  it("should render retry guidance and request IDs in the standard error state", () => {
    const error = Object.assign(new Error("Unable to load"), {
      digest: "request-123",
    });
    const markup = renderToStaticMarkup(
      <DashboardRouteErrorState
        action={{ href: "/dashboard", label: "Back to dashboard" }}
        description="Try again or return to dashboard."
        error={error}
        logKey="unit_test_route_error"
        reset={() => undefined}
        title="Dashboard unavailable"
      />,
    );

    expect(markup).toContain("Dashboard unavailable");
    expect(markup).toContain("Try again");
    expect(markup).toContain("Request ID: request-123");
    expect(markup).toContain('href="/dashboard"');
  });
});
