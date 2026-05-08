import { getDb } from "@/lib/db";
import { adminAuditLog } from "@/lib/db/schema";
import { desc, eq, count, sql } from "drizzle-orm";

export type AdminAuditLogEntry = {
  id: string;
  adminUserId: string;
  action: string;
  targetUserId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: Date;
};

export async function insertAdminAuditLog({
  action,
  adminUserId,
  metadata,
  targetUserId,
  ipAddress,
}: {
  action: string;
  adminUserId: string;
  metadata?: Record<string, unknown>;
  targetUserId?: string;
  ipAddress?: string;
}): Promise<AdminAuditLogEntry | null> {
  const db = getDb();

  try {
    const [entry] = await db
      .insert(adminAuditLog)
      .values({
        adminUserId,
        action,
        targetUserId: targetUserId ?? null,
        metadata: metadata ?? null,
        ipAddress: ipAddress ?? null,
      })
      .returning();

    if (!entry) return null;

    return {
      ...entry,
      metadata: entry.metadata as Record<string, unknown> | null,
    };
  } catch {
    // Audit logging is fire-and-forget — don't block on failure
    return null;
  }
}

export async function listAdminAuditLogs({
  limit,
  page,
  action,
}: {
  limit: number;
  page: number;
  action?: string;
}): Promise<{ entries: AdminAuditLogEntry[]; total: number }> {
  const db = getDb();
  const offset = (page - 1) * limit;

  const whereClause = action ? eq(adminAuditLog.action, action) : undefined;

  const [totalRow] = await db
    .select({ total: count(adminAuditLog.id) })
    .from(adminAuditLog)
    .where(whereClause);

  const rawEntries = await db
    .select()
    .from(adminAuditLog)
    .where(whereClause)
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    entries: rawEntries.map((e) => ({
      ...e,
      metadata: e.metadata as Record<string, unknown> | null,
    })),
    total: totalRow?.total ?? 0,
  };
}
