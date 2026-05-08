import { describe, it, expect, beforeAll } from "vitest";

// Integration tests require a real, reachable database connection.
// CI may expose placeholder DATABASE_URL values, so keep this opt-in.
const shouldSkip =
  process.env.RUN_DB_INTEGRATION_TESTS !== "true" || !process.env.DATABASE_URL;

describe.skipIf(shouldSkip)("adminAuditLog queries (integration)", () => {
  let insertAdminAuditLog: typeof import("@/lib/db/queries/admin-audit").insertAdminAuditLog;
  let listAdminAuditLogs: typeof import("@/lib/db/queries/admin-audit").listAdminAuditLogs;

  beforeAll(async () => {
    const mod = await import("@/lib/db/queries/admin-audit");
    insertAdminAuditLog = mod.insertAdminAuditLog;
    listAdminAuditLogs = mod.listAdminAuditLogs;
  });

  it("insertAdminAuditLog should return an entry", async () => {
    const entry = await insertAdminAuditLog({
      action: "user.plan.change",
      adminUserId: "00000000-0000-0000-0000-000000000001",
      targetUserId: "00000000-0000-0000-0000-000000000002",
      metadata: { previousPlan: "FREE", newPlan: "PRO" },
      ipAddress: "127.0.0.1",
    });

    expect(entry).toBeDefined();
    expect(entry?.action).toBe("user.plan.change");
    expect(entry?.adminUserId).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("listAdminAuditLogs should return paginated results", async () => {
    const result = await listAdminAuditLogs({ limit: 10, page: 1 });
    expect(result.entries).toBeDefined();
    expect(Array.isArray(result.entries)).toBe(true);
    expect(typeof result.total).toBe("number");
  });
});
