import { redirect } from "next/navigation";
import { AdminAnalyticsClient } from "@/app/(dashboard)/admin/analytics/admin-analytics-client";
import { requireSuperAdmin } from "@/lib/auth/superadmin";
import { getDb } from "@/lib/db";
import { SUPERADMIN_ROLE, users } from "@/lib/db/schema";
import { logger } from "@/lib/observability/logger";
import { eq } from "drizzle-orm";

async function requireSuperAdminPage(): Promise<void> {
  const authResult = await requireSuperAdmin();

  if (!authResult.ok) {
    redirect(
      authResult.status === 401
        ? "/login?callbackUrl=/admin/analytics"
        : "/dashboard",
    );
  }

  let dbRole: string | null = null;

  try {
    const db = getDb();
    const [dbUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, authResult.userId))
      .limit(1);
    dbRole = dbUser?.role ?? null;
  } catch (error) {
    logger.error("admin_analytics_page_role_check_failed", {
      error,
      userId: authResult.userId,
    });
    throw error;
  }

  if (dbRole !== SUPERADMIN_ROLE) {
    logger.warn("admin_analytics_page_role_mismatch", {
      dbRole: dbRole ?? "not_found",
      userId: authResult.userId,
    });
    redirect("/dashboard");
  }
}

export default async function AdminAnalyticsPage() {
  await requireSuperAdminPage();

  return <AdminAnalyticsClient />;
}
