import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(path: string): string {
  return readFileSync(path, "utf8");
}

describe("security observability and production smoke contracts", () => {
  it("should keep dashboard route error UI free of raw stack rendering", () => {
    const errorBoundaryFiles = [
      "src/app/(dashboard)/analytics/error.tsx",
      "src/app/(dashboard)/admin/analytics/error.tsx",
      "src/app/(dashboard)/admin/users/error.tsx",
      "src/app/(dashboard)/admin/users/[id]/error.tsx",
      "src/app/(dashboard)/links/new/error.tsx",
      "src/app/(dashboard)/settings/billing/error.tsx",
    ];

    for (const file of errorBoundaryFiles) {
      const source = readSource(file);

      expect(source).not.toContain("error.stack");
      expect(source).not.toContain("String(error)");
      expect(source).not.toContain("dangerouslySetInnerHTML");
    }
  });

  it("should keep analytics cache failure logs correlated with request IDs", () => {
    const cacheSource = readSource("src/lib/cache/analytics.ts");
    const analyticsRoute = readSource("src/app/api/v1/analytics/route.ts");
    const adminAnalyticsRoute = readSource("src/app/api/v1/admin/analytics/route.ts");

    for (const message of [
      "cache_version_read_failed",
      "cache_read_failed",
      "cache_write_failed",
    ]) {
      expect(cacheSource).toContain(message);
    }

    expect(cacheSource).toContain("requestId");
    expect(analyticsRoute).toContain("requestId,");
    expect(adminAnalyticsRoute).toContain("requestId: admin.requestId");
  });

  it("should log admin action failures without raw request payloads", () => {
    const source = readSource("src/app/api/v1/admin/users/[id]/route.ts");

    expect(source).toContain("logger.warn(\"admin_action_failed\"");
    expect(source).toContain("requestId");
    expect(source).toContain("adminUserId");
    expect(source).toContain("targetUserId");
    expect(source).not.toContain("logger.warn(\"admin_action_failed\", { body");
    expect(source).not.toContain("logger.warn(\"admin_action_failed\", { parsed");
  });

  it("should expose production smoke commands for public, authenticated, admin, and cache fallback paths", () => {
    const smokeScript = readSource("scripts/smoke-production.sh");
    const packageJson = readSource("package.json");

    expect(smokeScript).toContain("expect_status \"200\" \"$BASE_URL$path\"");
    expect(smokeScript).toContain("expect_authenticated_page \"/analytics\"");
    expect(smokeScript).toContain("expect_authenticated_page \"/admin/analytics\"");
    expect(smokeScript).toContain("expect_authenticated_json_api \"/api/v1/admin/analytics\"");
    expect(smokeScript).toContain("/api/v1/admin/users/$PRODUCTION_SMOKE_ADMIN_USER_ID");
    expect(smokeScript).toContain("PRODUCTION_SMOKE_COOKIE");
    expect(smokeScript).toContain("PRODUCTION_SMOKE_RUN_ADMIN_MUTATION");
    expect(packageJson).toContain("smoke:cache-fallback");
    expect(packageJson).toContain("cache-helpers.test.ts");
  });
});
