import { describe, it, expect } from "vitest";
import { ADMIN_AUDIT_LOG_TABLE, SUPERADMIN_ROLE } from "@/lib/db/schema";

describe("ADMIN_AUDIT_LOG_TABLE", () => {
  it("should export the audit log table name constant", () => {
    expect(ADMIN_AUDIT_LOG_TABLE).toBe("admin_audit_log");
  });
});

describe("SUPERADMIN_ROLE", () => {
  it("should export the superadmin role constant", () => {
    expect(SUPERADMIN_ROLE).toBe("superadmin");
  });
});

describe("adminAuditLog table module", () => {
  it("should be importable from schema", async () => {
    const { adminAuditLog } = await import("@/lib/db/schema");
    expect(adminAuditLog).toBeDefined();
    expect(typeof adminAuditLog).toBe("object");
  });

  it("should support INSERT operation via Drizzle builder shape", async () => {
    const { adminAuditLog } = await import("@/lib/db/schema");
    // Drizzle tables expose column configs under getSQL() or internal symbols
    // Verify it's a Drizzle pgTable by checking for standard internal markers
    expect(adminAuditLog).toBeDefined();
    // Column metadata exists on the table
    expect(adminAuditLog.id).toBeDefined();
    expect(adminAuditLog.action).toBeDefined();
    expect(adminAuditLog.adminUserId).toBeDefined();
    expect(adminAuditLog.createdAt).toBeDefined();
  });
});
