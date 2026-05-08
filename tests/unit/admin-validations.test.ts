import { describe, it, expect } from "vitest";
import {
  adminUpdateUserPlanSchema,
  adminSuspendUserSchema,
  adminUserListQuerySchema,
  adminAuditLogQuerySchema,
} from "@/lib/validations/admin";

describe("adminUpdateUserPlanSchema", () => {
  it("accepts valid plan values", () => {
    for (const plan of ["FREE", "PRO", "BUSINESS"] as const) {
      const result = adminUpdateUserPlanSchema.safeParse({ plan });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid plan values", () => {
    const result = adminUpdateUserPlanSchema.safeParse({ plan: "ENTERPRISE" });
    expect(result.success).toBe(false);
  });

  it("rejects empty plan", () => {
    const result = adminUpdateUserPlanSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("adminSuspendUserSchema", () => {
  it("accepts 'suspend'", () => {
    const result = adminSuspendUserSchema.safeParse({ action: "suspend" });
    expect(result.success).toBe(true);
  });

  it("accepts 'unsuspend'", () => {
    const result = adminSuspendUserSchema.safeParse({ action: "unsuspend" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid actions", () => {
    const result = adminSuspendUserSchema.safeParse({ action: "delete" });
    expect(result.success).toBe(false);
  });

  it("rejects empty body", () => {
    const result = adminSuspendUserSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("adminUserListQuerySchema", () => {
  it("provides defaults for empty query", () => {
    const result = adminUserListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it("parses page and limit as numbers", () => {
    const result = adminUserListQuerySchema.safeParse({ page: "3", limit: "50" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(50);
    }
  });

  it("enforces max limit of 100", () => {
    const result = adminUserListQuerySchema.safeParse({ limit: "1000" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(100);
    }
  });

  it("accepts optional search and plan filters", () => {
    const result = adminUserListQuerySchema.safeParse({
      search: "test@email.com",
      plan: "PRO",
    });
    expect(result.success).toBe(true);
  });
});

describe("adminAuditLogQuerySchema", () => {
  it("provides defaults for empty query", () => {
    const result = adminAuditLogQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it("accepts action filter", () => {
    const result = adminAuditLogQuerySchema.safeParse({ action: "user.suspend" });
    expect(result.success).toBe(true);
  });
});
