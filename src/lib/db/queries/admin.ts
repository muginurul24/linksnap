import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  or,
  sql,
} from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  adminAuditLog,
  clickEvents,
  links,
  subscriptions,
  transactions,
  users,
} from "@/lib/db/schema";
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
  activeUsers: number;
  adminActionsLast30Days: number;
  clicksLast30Days: number;
  failedPaymentsLast30Days: number;
  growthTrend: Array<{
    clicks: number;
    date: string;
    links: number;
    users: number;
  }>;
  lastUpdatedAt: string;
  totalUsers: number;
  totalLinks: number;
  totalClicks: number;
  pendingPayments: number;
  totalRevenueIdr: number;
  settledRevenueIdr: number;
  planDistribution: Record<UserPlan, number>;
  recentAdminActions: Array<{
    action: string;
    count: number;
  }>;
  topUsersByClicks: AdminTopUser[];
  topUsersByLinks: AdminTopUser[];
  usersLast30Days: number;
  linksLast30Days: number;
};

export type AdminTopUser = {
  email: string;
  id: string;
  name: string | null;
  plan: UserPlan;
  totalClicks: number;
  totalLinks: number;
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

const DAY_MS = 24 * 60 * 60 * 1000;
const ADMIN_ANALYTICS_WINDOW_DAYS = 30;

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  ));
}

function buildGrowthBuckets(now: Date): AdminSystemStats["growthTrend"] {
  const today = startOfUtcDay(now);

  return Array.from({ length: ADMIN_ANALYTICS_WINDOW_DAYS }, (_, index) => {
    const date = new Date(
      today.getTime() - (ADMIN_ANALYTICS_WINDOW_DAYS - 1 - index) * DAY_MS,
    );

    return {
      clicks: 0,
      date: dateKey(date),
      links: 0,
      users: 0,
    };
  });
}

function countByDate<T extends { count: number; date: string }>(
  rows: T[],
): Map<string, number> {
  return new Map(rows.map((row) => [row.date, Number(row.count)]));
}

export async function getSystemStats(now = new Date()): Promise<AdminSystemStats> {
  const db = getDb();
  const thirtyDaysAgo = new Date(
    startOfUtcDay(now).getTime() - (ADMIN_ANALYTICS_WINDOW_DAYS - 1) * DAY_MS,
  );
  const userDate =
    sql<string>`to_char(date_trunc('day', ${users.createdAt}), 'YYYY-MM-DD')`;
  const linkDate =
    sql<string>`to_char(date_trunc('day', ${links.createdAt}), 'YYYY-MM-DD')`;
  const clickDate =
    sql<string>`to_char(date_trunc('day', ${clickEvents.timestamp}), 'YYYY-MM-DD')`;

  const clickCountExpr = count(clickEvents.id);
  const distinctLinkCountExpr = countDistinct(links.id);

  const [
    stats,
    planRows,
    userGrowthRows,
    linkGrowthRows,
    clickGrowthRows,
    topUsersByLinksRows,
    topUsersByClicksRows,
    recentAdminActionRows,
  ] = await Promise.all([
    db
      .select({
        activeUsers:
          sql<number>`count(*) filter (where ${users.deletedAt} is null)`.mapWith(
            Number,
          ),
        adminActionsLast30Days:
          sql<number>`(SELECT count(*) FROM ${adminAuditLog} WHERE ${adminAuditLog.createdAt} >= ${thirtyDaysAgo})`.mapWith(
            Number,
          ),
        clicksLast30Days:
          sql<number>`(SELECT count(*) FROM ${clickEvents} WHERE ${clickEvents.timestamp} >= ${thirtyDaysAgo})`.mapWith(
            Number,
          ),
        failedPaymentsLast30Days:
          sql<number>`(SELECT count(*) FROM ${transactions} WHERE ${transactions.createdAt} >= ${thirtyDaysAgo} AND ${transactions.status} IN ('CANCEL', 'DENY', 'EXPIRE'))`.mapWith(
            Number,
          ),
        linksLast30Days:
          sql<number>`(SELECT count(*) FROM ${links} WHERE ${links.createdAt} >= ${thirtyDaysAgo})`.mapWith(
            Number,
          ),
        pendingPayments:
          sql<number>`(SELECT count(*) FROM ${transactions} WHERE ${transactions.status} = 'PENDING')`.mapWith(
            Number,
          ),
        settledRevenueIdr:
          sql<number>`COALESCE((SELECT sum(gross_amount_idr) FROM ${transactions} WHERE ${transactions.status} = 'SETTLEMENT'), 0)`.mapWith(
            Number,
          ),
        totalClicks:
          sql<number>`(SELECT count(*) FROM ${clickEvents})`.mapWith(Number),
        totalLinks: sql<number>`(SELECT count(*) FROM ${links})`.mapWith(Number),
        totalUsers: count(users.id),
        usersLast30Days:
          sql<number>`count(*) filter (where ${users.createdAt} >= ${thirtyDaysAgo})`.mapWith(
            Number,
          ),
      })
      .from(users)
      .then((rows) => rows[0]),
    db
      .select({
        count: count(users.id),
        plan: users.plan,
      })
      .from(users)
      .groupBy(users.plan),
    db
      .select({
        count: count(users.id),
        date: userDate,
      })
      .from(users)
      .where(gte(users.createdAt, thirtyDaysAgo))
      .groupBy(userDate)
      .orderBy(userDate),
    db
      .select({
        count: count(links.id),
        date: linkDate,
      })
      .from(links)
      .where(gte(links.createdAt, thirtyDaysAgo))
      .groupBy(linkDate)
      .orderBy(linkDate),
    db
      .select({
        count: count(clickEvents.id),
        date: clickDate,
      })
      .from(clickEvents)
      .where(gte(clickEvents.timestamp, thirtyDaysAgo))
      .groupBy(clickDate)
      .orderBy(clickDate),
    db
      .select({
        email: users.email,
        id: users.id,
        name: users.name,
        plan: users.plan,
        totalClicks: clickCountExpr,
        totalLinks: distinctLinkCountExpr,
      })
      .from(users)
      .leftJoin(links, eq(links.userId, users.id))
      .leftJoin(clickEvents, eq(clickEvents.linkId, links.id))
      .groupBy(users.id, users.email, users.name, users.plan)
      .orderBy(desc(distinctLinkCountExpr), desc(users.createdAt))
      .limit(5),
    db
      .select({
        email: users.email,
        id: users.id,
        name: users.name,
        plan: users.plan,
        totalClicks: clickCountExpr,
        totalLinks: distinctLinkCountExpr,
      })
      .from(users)
      .leftJoin(links, eq(links.userId, users.id))
      .leftJoin(clickEvents, eq(clickEvents.linkId, links.id))
      .groupBy(users.id, users.email, users.name, users.plan)
      .orderBy(desc(clickCountExpr), desc(users.createdAt))
      .limit(5),
    db
      .select({
        action: adminAuditLog.action,
        count: count(adminAuditLog.id),
      })
      .from(adminAuditLog)
      .where(gte(adminAuditLog.createdAt, thirtyDaysAgo))
      .groupBy(adminAuditLog.action)
      .orderBy(desc(count(adminAuditLog.id)))
      .limit(5),
  ]);

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
  const userGrowth = countByDate(userGrowthRows);
  const linkGrowth = countByDate(linkGrowthRows);
  const clickGrowth = countByDate(clickGrowthRows);
  const growthTrend = buildGrowthBuckets(now).map((bucket) => ({
    ...bucket,
    clicks: clickGrowth.get(bucket.date) ?? 0,
    links: linkGrowth.get(bucket.date) ?? 0,
    users: userGrowth.get(bucket.date) ?? 0,
  }));
  const topUsersByClicks = topUsersByClicksRows.map((row) => ({
    email: row.email,
    id: row.id,
    name: row.name,
    plan: row.plan,
    totalClicks: Number(row.totalClicks),
    totalLinks: Number(row.totalLinks),
  }));

  return {
    activeUsers: stats?.activeUsers ?? 0,
    adminActionsLast30Days: stats?.adminActionsLast30Days ?? 0,
    clicksLast30Days: stats?.clicksLast30Days ?? 0,
    failedPaymentsLast30Days: stats?.failedPaymentsLast30Days ?? 0,
    growthTrend,
    lastUpdatedAt: now.toISOString(),
    linksLast30Days: stats?.linksLast30Days ?? 0,
    pendingPayments: stats?.pendingPayments ?? 0,
    planDistribution,
    recentAdminActions: recentAdminActionRows.map((row) => ({
      action: row.action,
      count: Number(row.count),
    })),
    settledRevenueIdr: stats?.settledRevenueIdr ?? 0,
    topUsersByClicks,
    topUsersByLinks: topUsersByLinksRows.map((row) => ({
      email: row.email,
      id: row.id,
      name: row.name,
      plan: row.plan,
      totalClicks: Number(row.totalClicks),
      totalLinks: Number(row.totalLinks),
    })),
    totalUsers: stats?.totalUsers ?? 0,
    totalLinks: stats?.totalLinks ?? 0,
    totalClicks: stats?.totalClicks ?? 0,
    totalRevenueIdr: stats?.settledRevenueIdr ?? 0,
    usersLast30Days: stats?.usersLast30Days ?? 0,
  };
}
