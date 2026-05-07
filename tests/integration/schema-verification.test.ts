import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { apiKeys, resetTokens, users } from "../../src/lib/db/schema";

describe("schema verification", () => {
  it("should include account settings and 2FA columns", () => {
    const columns = getTableColumns(users);

    expect(columns.notifications).toBeDefined();
    expect(columns.twoFactorSecret).toBeDefined();
    expect(columns.twoFactorEnabled).toBeDefined();
    expect(columns.deletedAt).toBeDefined();
  });

  it("should include reset token and API key tables", () => {
    expect(getTableColumns(resetTokens).tokenHash).toBeDefined();
    expect(getTableColumns(apiKeys).keyHash).toBeDefined();
  });
});
