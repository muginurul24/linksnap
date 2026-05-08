import { eq, ilike, or, and, count, desc, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users, links, clickEvents, transactions, subscriptions } from "@/lib/db/schema";
import type { UserPlan } from "@/lib/links/limits";

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  plan: UserPlan;
  role: string;
  emailVerified: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  linkCount: number;
};

export type AdminUserDetail = AdminUser & {
  avatarUrl: string | null;
  googleId: string | null;
  twoFactorEnabled: boolean;
  updatedAt: Date;
  totalClicks: number;
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
};

export type AdminSystemStats = {
  totalUsers: number;
  totalLinks: number;
  totalClicks: number;
  totalRevenueIdr: number;
  planDistribution: Record<UserPlan, number>;
  usersLast30Days: number;
  linksLast30Days: number;
};

export async function listAllUsers({
  limit,
  page,
  search,
  plan,
}: {
  limit: number;
  page: number;
  search?: string;
  plan?: UserPlan;
}): Promise<{ users: AdminUser[]; total: number }> {
  const db = getDb();
  const offset = (page - 1) * limit;

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(users.email, `%${search}%`),
        ilike(users.name ?? sql`''`, `%${search}%`),
      ),
    );
  }
  if (plan) {
    conditions.push(eq(users.plan, plan));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRow] = await db
    .select({ total: count(users.id) })
    .from(users)
    .where(whereClause);

  const rawUsers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      plan: users.plan,
      role: users.role,
      emailVerified: users.emailVerified,
      deletedAt: users.deletedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(whereClause)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  // Get link counts for each user
  const userIds = rawUsers.map((u) => u.id);
  const counts =
    userIds.length > 0
      ? await db
          .select({
            userId: links.userId,
            count: count(links.id),
          })
          .from(links)
          .where(inArray(links.userId, userIds))
          .groupBy(links.userId)
      : [];
  const linkCounts: Record<string, number> = {};
  for (const row of counts) {
    linkCounts[row.userId] = row.count;
  }

  const usersList: AdminUser[] = rawUsers.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    plan: u.plan,
    role: u.role,
    emailVerified: u.emailVerified,
    deletedAt: u.deletedAt,
    createdAt: u.createdAt,
    linkCount: linkCounts[u.id] ?? 0,
  }));

  return { users: usersList, total: totalRow?.total ?? 0 };
}

export async function getUserDetailById(
  id: string,
): Promise<AdminUserDetail | null> {
  const db = getDb();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user) return null;

  const [linkCountRow] = await db
    .select({ total: count(links.id) })
    .from(links)
    .where(eq(links.userId, id));

  const [clickCountRow] = await db
    .select({ total: count(clickEvents.id) })
    .from(clickEvents)
    .innerJoin(links, eq(links.id, clickEvents.linkId))
    .where(eq(links.userId, id));

  // Get subscription status (best-effort)
  let subscriptionPlan: string | null = null;
  let subscriptionStatus: string | null = null;
  try {
    const [sub] = await db
      .select({
        plan: subscriptions.plan,
        status: subscriptions.status,
      })
      .from(subscriptions)
      .where(eq(subscriptions.userId, id))
      .limit(1);
    if (sub) {
      subscriptionPlan = sub.plan;
      subscriptionStatus = sub.status;
    }
  } catch {
    // Subscription lookup is best-effort
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    role: user.role,
    emailVerified: user.emailVerified,
    deletedAt: user.deletedAt,
    createdAt: user.createdAt,
    avatarUrl: user.avatarUrl,
    googleId: user.googleId,
    twoFactorEnabled: user.twoFactorEnabled,
    updatedAt: user.updatedAt,
    linkCount: linkCountRow?.total ?? 0,
    totalClicks: clickCountRow?.total ?? 0,
    subscriptionPlan,
    subscriptionStatus,
  };
}

export async function updateUserPlan({
  userId,
  plan,
}: {
  userId: string;
  plan: UserPlan;
}): Promise<{ updated: boolean; previousPlan: string | null }> {
  const db = getDb();

  const [existing] = await db
    .select({ plan: users.plan })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!existing) return { updated: false, previousPlan: null };

  await db
    .update(users)
    .set({ plan })
    .where(eq(users.id, userId));

  return { updated: true, previousPlan: existing.plan };
}

export async function suspendUser(
  userId: string,
): Promise<boolean> {
  const db = getDb();

  const [existing] = await db
    .select({ deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!existing) return false;

  await db
    .update(users)
    .set({ deletedAt: new Date() })
    .where(eq(users.id, userId));

  return true;
}

export async function unsuspendUser(
  userId: string,
): Promise<boolean> {
  const db = getDb();

  const [existing] = await db
    .select({ deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!existing) return false;

  await db
    .update(users)
    .set({ deletedAt: null })
    .where(eq(users.id, userId));

  return true;
}

export async function getSystemStats(): Promise<AdminSystemStats> {
  const db = getDb();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

  // Single CTE-based query combining 5 scalar stats into one round trip.
  // Plan distribution still needs a separate GROUP BY query.
  const [stats] = await db
    .select({
      totalUsers: count(users.id),
      totalLinks: sql<number>`(SELECT count(*) FROM ${links})`.mapWith(Number),
      totalClicks: sql<number>`(SELECT count(*) FROM ${clickEvents})`.mapWith(Number),
      totalRevenueIdr:
        sql<number>`COALESCE((SELECT sum(gross_amount_idr) FROM ${transactions} WHERE status = 'SETTLEMENT'), 0)`.mapWith(
          Number,
        ),
      usersLast30Days:
        sql<number>`(SELECT count(*) FROM ${users} WHERE created_at >= ${thirtyDaysAgoISO})`.mapWith(
          Number,
        ),
      linksLast30Days:
        sql<number>`(SELECT count(*) FROM ${links} WHERE created_at >= ${thirtyDaysAgoISO})`.mapWith(
          Number,
        ),
    })
    .from(users);

  const planRows = await db
    .select({
      plan: users.plan,
      count: count(users.id),
    })
    .from(users)
    .groupBy(users.plan);

  const planDistribution: Record<UserPlan, number> = {
    BUSINESS: 0,
    FREE: 0,
    PRO: 0,
  };
  for (const row of planRows) {
    if (row.plan) {
      planDistribution[row.plan] = row.count;
    }
  }

  return {
    totalUsers: stats?.totalUsers ?? 0,
    totalLinks: stats?.totalLinks ?? 0,
    totalClicks: stats?.totalClicks ?? 0,
    totalRevenueIdr: stats?.totalRevenueIdr ?? 0,
    planDistribution,
    usersLast30Days: stats?.usersLast30Days ?? 0,
    linksLast30Days: stats?.linksLast30Days ?? 0,
  };
}
