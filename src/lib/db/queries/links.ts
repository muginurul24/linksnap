import {
  and,
  count,
  desc,
  eq,
  gte,
  gt,
  ilike,
  inArray,
  isNull,
  lt,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/lib/db";
import { retryTransientDbQuery } from "@/lib/db/retry";
import {
  clickEvents,
  linkPages,
  links,
  smartRules,
  users,
} from "@/lib/db/schema";
import type { UserPlan } from "@/lib/links/limits";
import type { RedirectLink } from "@/lib/links/redirect";
import {
  getCursorPage,
  type CreatedAtCursor,
} from "@/lib/pagination/cursor";

export type CreatedLink = {
  destinationUrl: string;
  id: string;
  slug: string;
};

export type OwnedLinkForCampaignAssignment = {
  destinationUrl: string;
  id: string;
};

type CreateLinkRecordInput = {
  destinationUrl: string;
  slug: string;
  title?: string;
  userId: string;
};

export type ListedLink = {
  campaignId: string | null;
  clickCount: number;
  createdAt: Date;
  destinationUrl: string;
  hasLinkPage: boolean;
  id: string;
  isActive: boolean;
  slug: string;
  title: string | null;
  updatedAt: Date;
};

export type LinkClickTrendPoint = {
  date: string;
  totalClicks: number;
};

export type ListedLinkWithTrend = ListedLink & {
  clickTrend: LinkClickTrendPoint[];
  clicksLast7Days: number;
};

export type QrCodeSort = "most-scanned" | "recently-created";

export type ListedQrCodeLink = ListedLink & {
  lastScanAt: Date | null;
  qrScanCount: number;
  qrScansLast30Days: number;
};

export type ListedLinkPage = {
  brandName: string;
  createdAt: Date;
  ctaClickThroughRate: number;
  ctaClicks: number;
  clickTrend: LinkPageTrendPoint[];
  ctaText: string;
  hasCountdown: boolean;
  id: string;
  isActive: boolean;
  linkId: string;
  pageViews: number;
  pageViewsLast7Days: number;
  showQrCode: boolean;
  slug: string;
  title: string;
  updatedAt: Date;
};

export type LinkPageTrendPoint = {
  date: string;
  pageViews: number;
};

export type LinkDetail = ListedLink & {
  expiresAt: Date | null;
  scheduledAt: Date | null;
  userId: string;
};

export type PublicLinkPage = {
  brandLogo: string | null;
  brandName: string;
  countdownTarget: Date | null;
  ctaColor: string;
  ctaText: string;
  description: string | null;
  ogImage: string | null;
  showCountdown: boolean | null;
  showQrCode: boolean | null;
  showSocialProof: boolean | null;
  theme: string;
  title: string;
};

export type QrGenerationLink = RedirectLink & {
  qrCodeCountBefore: number;
  userPlan: UserPlan;
};

export type EditableLinkPage = {
  brandName: string;
  ctaColor: string;
  ctaText: string;
  description: string | null;
  title: string;
};

export type LinkPageRecord = {
  brandName: string;
  countdownTarget: Date | null;
  ctaColor: string;
  ctaText: string;
  description: string | null;
  id: string;
  linkId: string;
  ogImage: string | null;
  showCountdown: boolean | null;
  showQrCode: boolean | null;
  showSocialProof: boolean | null;
  theme: string;
  title: string;
  updatedAt: Date;
};

export type EditableSmartRule = {
  condition: unknown;
  destinationUrl: string;
  id: string;
  priority: number;
  type: typeof smartRules.$inferSelect["type"];
};

export type EditableLink = LinkDetail & {
  linkPage: EditableLinkPage | null;
  smartRules: EditableSmartRule[];
};

type ListLinksInput = {
  campaignId?: string;
  cursor?: CreatedAtCursor;
  limit: number;
  page: number;
  search?: string;
  unassigned?: boolean;
  userId: string;
};

type ListLinkPagesInput = {
  cursor?: CreatedAtCursor;
  limit: number;
  page: number;
  userId: string;
};

type ListQrCodeLinksInput = ListLinksInput & {
  now?: Date;
  sort?: QrCodeSort;
};

type ListLinksWithTrendsInput = ListLinksInput & {
  now?: Date;
};

type UpdateLinkRecordInput = {
  destinationUrl?: string;
  id: string;
  slug?: string;
  title?: string | null;
  userId: string;
};

type SetLinksCampaignInput = {
  campaignId: string;
  destinationUrlsById?: ReadonlyMap<string, string>;
  linkIds: string[];
  userId: string;
};

type RemoveLinkFromCampaignInput = {
  campaignId: string;
  linkId: string;
  userId: string;
};

type UpsertLinkPageRecordInput = {
  brandName: string;
  countdownTarget?: Date | null;
  ctaColor: string;
  ctaText: string;
  description?: string | null;
  linkId: string;
  ogImage?: string | null;
  showCountdown: boolean;
  showQrCode: boolean;
  showSocialProof: boolean;
  theme: string;
  title: string;
};

const linkPageRecordColumns = {
  brandName: true,
  countdownTarget: true,
  ctaColor: true,
  ctaText: true,
  description: true,
  id: true,
  linkId: true,
  ogImage: true,
  showCountdown: true,
  showQrCode: true,
  showSocialProof: true,
  theme: true,
  title: true,
  updatedAt: true,
} as const;

const linkDetailColumns = {
  campaignId: true,
  clickCount: true,
  createdAt: true,
  destinationUrl: true,
  expiresAt: true,
  hasLinkPage: true,
  id: true,
  isActive: true,
  scheduledAt: true,
  slug: true,
  title: true,
  updatedAt: true,
  userId: true,
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;
const LINK_TREND_DAYS = 7;
const LINK_PAGE_TREND_DAYS = 7;
const QR_SCAN_REFERRER = "qr";
const QR_SCAN_WINDOW_DAYS = 30;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  ));
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getLinkPageTrendRange(now = new Date()): {
  dates: string[];
  from: Date;
  to: Date;
} {
  const to = now;
  const from = new Date(
    startOfUtcDay(now).getTime() - (LINK_PAGE_TREND_DAYS - 1) * DAY_MS,
  );
  const dates = Array.from({ length: LINK_PAGE_TREND_DAYS }, (_, index) =>
    formatUtcDate(new Date(from.getTime() + index * DAY_MS)),
  );

  return { dates, from, to };
}

function getLinkClickTrendRange(now = new Date()): {
  dates: string[];
  from: Date;
  to: Date;
} {
  const to = now;
  const from = new Date(
    startOfUtcDay(now).getTime() - (LINK_TREND_DAYS - 1) * DAY_MS,
  );
  const dates = Array.from({ length: LINK_TREND_DAYS }, (_, index) =>
    formatUtcDate(new Date(from.getTime() + index * DAY_MS)),
  );

  return { dates, from, to };
}

function getClickThroughRate(ctaClicks: number, pageViews: number): number {
  if (pageViews === 0) return 0;

  return Number((ctaClicks / pageViews).toFixed(4));
}

export async function getUserPlanById(userId: string): Promise<UserPlan | null> {
  const user = await db.query.users.findFirst({
    columns: { plan: true },
    where: eq(users.id, userId),
  });

  return user?.plan ?? null;
}

export async function countLinksByUserId(userId: string): Promise<number> {
  const [row] = await retryTransientDbQuery(() =>
    db
      .select({ value: count() })
      .from(links)
      .where(eq(links.userId, userId)),
  );

  return row?.value ?? 0;
}

export async function countLinkPagesByUserId(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(linkPages)
    .innerJoin(links, eq(linkPages.linkId, links.id))
    .where(eq(links.userId, userId));

  return row?.value ?? 0;
}

export async function listLinkPagesByUserId(
  userId: string,
): Promise<ListedLinkPage[]> {
  const pages = await db
    .select({
      brandName: linkPages.brandName,
      countdownTarget: linkPages.countdownTarget,
      createdAt: linkPages.createdAt,
      ctaText: linkPages.ctaText,
      hasLinkPage: links.hasLinkPage,
      id: linkPages.id,
      isLinkActive: links.isActive,
      linkId: linkPages.linkId,
      showCountdown: linkPages.showCountdown,
      showQrCode: linkPages.showQrCode,
      slug: links.slug,
      title: linkPages.title,
      updatedAt: linkPages.updatedAt,
    })
    .from(linkPages)
    .innerJoin(links, eq(linkPages.linkId, links.id))
    .where(eq(links.userId, userId))
    .orderBy(desc(linkPages.updatedAt));

  return hydrateListedLinkPages(pages);
}

export async function listLinkPagesByUserIdPaginated({
  cursor,
  limit,
  page,
  userId,
}: ListLinkPagesInput): Promise<{
  items: ListedLinkPage[];
  nextCursor: string | null;
  total: number;
}> {
  const baseWhere = eq(links.userId, userId);
  const cursorWhere = cursor ? buildLinkPagesCursorWhere(cursor) : undefined;
  const paginatedWhere = cursorWhere ? and(baseWhere, cursorWhere) : baseWhere;
  const offset = (page - 1) * limit;
  const rowLimit = cursor ? limit + 1 : limit;

  const [pages, totalRows] = await Promise.all([
    db
      .select({
        brandName: linkPages.brandName,
        countdownTarget: linkPages.countdownTarget,
        createdAt: linkPages.createdAt,
        ctaText: linkPages.ctaText,
        hasLinkPage: links.hasLinkPage,
        id: linkPages.id,
        isLinkActive: links.isActive,
        linkId: linkPages.linkId,
        showCountdown: linkPages.showCountdown,
        showQrCode: linkPages.showQrCode,
        slug: links.slug,
        title: linkPages.title,
        updatedAt: linkPages.updatedAt,
      })
      .from(linkPages)
      .innerJoin(links, eq(linkPages.linkId, links.id))
      .where(paginatedWhere)
      .orderBy(desc(linkPages.createdAt), desc(linkPages.id))
      .limit(rowLimit)
      .offset(cursor ? 0 : offset),
    db
      .select({ value: count() })
      .from(linkPages)
      .innerJoin(links, eq(linkPages.linkId, links.id))
      .where(baseWhere),
  ]);
  const cursorPage = cursor ? getCursorPage(pages, limit) : null;

  return {
    items: await hydrateListedLinkPages(cursorPage?.items ?? pages),
    nextCursor: cursorPage?.nextCursor ?? null,
    total: totalRows[0]?.value ?? 0,
  };
}

export async function findLinkBySlug(slug: string): Promise<{ id: string } | null> {
  const link = await db.query.links.findFirst({
    columns: { id: true },
    where: eq(links.slug, slug),
  });

  return link ?? null;
}

export async function findRedirectLinkBySlug(
  slug: string,
): Promise<RedirectLink | null> {
  const link = await db.query.links.findFirst({
    columns: {
      clickCount: true,
      destinationUrl: true,
      expiresAt: true,
      hasLinkPage: true,
      id: true,
      isActive: true,
      scheduledAt: true,
      slug: true,
    },
    where: eq(links.slug, slug),
  });

  return link ?? null;
}

export async function listRedirectLinksForCacheWarmup({
  limit,
}: {
  limit: number;
}): Promise<RedirectLink[]> {
  const now = new Date();

  return db
    .select({
      clickCount: links.clickCount,
      destinationUrl: links.destinationUrl,
      expiresAt: links.expiresAt,
      hasLinkPage: links.hasLinkPage,
      id: links.id,
      isActive: links.isActive,
      scheduledAt: links.scheduledAt,
      slug: links.slug,
    })
    .from(links)
    .where(
      and(
        eq(links.isActive, true),
        or(isNull(links.scheduledAt), lte(links.scheduledAt, now)),
        or(isNull(links.expiresAt), gt(links.expiresAt, now)),
      ),
    )
    .orderBy(desc(links.clickCount), desc(links.updatedAt))
    .limit(limit);
}

export async function findQrGenerationLinkBySlug(
  slug: string,
): Promise<QrGenerationLink | null> {
  const [link] = await db
    .select({
      clickCount: links.clickCount,
      createdAt: links.createdAt,
      destinationUrl: links.destinationUrl,
      expiresAt: links.expiresAt,
      hasLinkPage: links.hasLinkPage,
      id: links.id,
      isActive: links.isActive,
      scheduledAt: links.scheduledAt,
      slug: links.slug,
      userId: links.userId,
      userPlan: users.plan,
    })
    .from(links)
    .innerJoin(users, eq(users.id, links.userId))
    .where(eq(links.slug, slug))
    .limit(1);

  if (!link) return null;

  const [countBefore] = await db
    .select({ value: count() })
    .from(links)
    .where(
      and(
        eq(links.userId, link.userId),
        eq(links.isActive, true),
        lt(links.createdAt, link.createdAt),
      ),
    );

  return {
    clickCount: link.clickCount,
    destinationUrl: link.destinationUrl,
    expiresAt: link.expiresAt,
    hasLinkPage: link.hasLinkPage,
    id: link.id,
    isActive: link.isActive,
    qrCodeCountBefore: countBefore?.value ?? 0,
    scheduledAt: link.scheduledAt,
    slug: link.slug,
    userPlan: link.userPlan,
  };
}

export async function findPublicLinkPageByLinkId(
  linkId: string,
): Promise<PublicLinkPage | null> {
  const page = await db.query.linkPages.findFirst({
    columns: {
      brandLogo: true,
      brandName: true,
      countdownTarget: true,
      ctaColor: true,
      ctaText: true,
      description: true,
      ogImage: true,
      showCountdown: true,
      showQrCode: true,
      showSocialProof: true,
      theme: true,
      title: true,
    },
    where: eq(linkPages.linkId, linkId),
  });

  return page ?? null;
}

export async function findLinkPageByLinkId(
  linkId: string,
): Promise<LinkPageRecord | null> {
  const page = await db.query.linkPages.findFirst({
    columns: linkPageRecordColumns,
    where: eq(linkPages.linkId, linkId),
  });

  return page ?? null;
}

export async function findLinkById(id: string): Promise<LinkDetail | null> {
  const link = await db.query.links.findFirst({
    columns: linkDetailColumns,
    where: eq(links.id, id),
  });

  return link ?? null;
}

export async function findEditableLinkBySlugForUser(
  slug: string,
  userId: string,
): Promise<EditableLink | null> {
  const link = await db.query.links.findFirst({
    columns: linkDetailColumns,
    where: and(eq(links.slug, slug), eq(links.userId, userId)),
  });

  if (!link) return null;

  const [linkPage, rules] = await Promise.all([
    db.query.linkPages.findFirst({
      columns: {
        brandName: true,
        ctaColor: true,
        ctaText: true,
        description: true,
        title: true,
      },
      where: eq(linkPages.linkId, link.id),
    }),
    db.query.smartRules.findMany({
      columns: {
        condition: true,
        destinationUrl: true,
        id: true,
        priority: true,
        type: true,
      },
      where: eq(smartRules.linkId, link.id),
      orderBy: (table, { asc }) => [asc(table.priority)],
    }),
  ]);

  return {
    ...link,
    linkPage: linkPage ?? null,
    smartRules: rules,
  };
}

export async function createLinkRecord({
  destinationUrl,
  slug,
  title,
  userId,
}: CreateLinkRecordInput): Promise<CreatedLink> {
  const [link] = await db
    .insert(links)
    .values({
      destinationUrl,
      slug,
      userId,
      ...(title === undefined ? {} : { title }),
    })
    .returning({
      destinationUrl: links.destinationUrl,
      id: links.id,
      slug: links.slug,
    });

  if (!link) throw new Error("Unable to create link record.");

  return link;
}

export async function updateLinkRecordForUser({
  destinationUrl,
  id,
  slug,
  title,
  userId,
}: UpdateLinkRecordInput): Promise<LinkDetail | null> {
  const [link] = await db
    .update(links)
    .set({
      ...(destinationUrl === undefined ? {} : { destinationUrl }),
      ...(slug === undefined ? {} : { slug }),
      ...(title === undefined ? {} : { title }),
      updatedAt: new Date(),
    })
    .where(and(eq(links.id, id), eq(links.userId, userId)))
    .returning({
      campaignId: links.campaignId,
      clickCount: links.clickCount,
      createdAt: links.createdAt,
      destinationUrl: links.destinationUrl,
      expiresAt: links.expiresAt,
      hasLinkPage: links.hasLinkPage,
      id: links.id,
      isActive: links.isActive,
      scheduledAt: links.scheduledAt,
      slug: links.slug,
      title: links.title,
      updatedAt: links.updatedAt,
      userId: links.userId,
    });

  return link ?? null;
}

export async function setLinkPageEnabledForUser({
  enabled,
  id,
  userId,
}: {
  enabled: boolean;
  id: string;
  userId: string;
}): Promise<{ id: string } | null> {
  const [link] = await db
    .update(links)
    .set({ hasLinkPage: enabled, updatedAt: new Date() })
    .where(and(eq(links.id, id), eq(links.userId, userId)))
    .returning({ id: links.id });

  return link ?? null;
}

export async function listOwnedLinkIdsByIds({
  linkIds,
  userId,
}: {
  linkIds: string[];
  userId: string;
}): Promise<string[]> {
  if (linkIds.length === 0) return [];

  const rows = await db
    .select({ id: links.id })
    .from(links)
    .where(and(eq(links.userId, userId), inArray(links.id, linkIds)));

  return rows.map((row) => row.id);
}

export async function listOwnedLinksByIds({
  linkIds,
  userId,
}: {
  linkIds: string[];
  userId: string;
}): Promise<OwnedLinkForCampaignAssignment[]> {
  if (linkIds.length === 0) return [];

  return db
    .select({
      destinationUrl: links.destinationUrl,
      id: links.id,
    })
    .from(links)
    .where(and(eq(links.userId, userId), inArray(links.id, linkIds)));
}

export async function setLinksCampaignForUser({
  campaignId,
  destinationUrlsById,
  linkIds,
  userId,
}: SetLinksCampaignInput): Promise<string[]> {
  if (linkIds.length === 0) return [];

  if (destinationUrlsById?.size) {
    const updatedIds = new Set<string>();
    const idsWithoutDestinationUpdate = linkIds.filter(
      (id) => !destinationUrlsById.has(id),
    );

    if (idsWithoutDestinationUpdate.length > 0) {
      const updated = await db
        .update(links)
        .set({ campaignId, updatedAt: new Date() })
        .where(
          and(
            eq(links.userId, userId),
            inArray(links.id, idsWithoutDestinationUpdate),
          ),
        )
        .returning({ id: links.id });

      for (const link of updated) updatedIds.add(link.id);
    }

    for (const [id, destinationUrl] of destinationUrlsById) {
      const [link] = await db
        .update(links)
        .set({ campaignId, destinationUrl, updatedAt: new Date() })
        .where(and(eq(links.id, id), eq(links.userId, userId)))
        .returning({ id: links.id });

      if (link) updatedIds.add(link.id);
    }

    return linkIds.filter((id) => updatedIds.has(id));
  }

  const updated = await db
    .update(links)
    .set({ campaignId, updatedAt: new Date() })
    .where(and(eq(links.userId, userId), inArray(links.id, linkIds)))
    .returning({ id: links.id });

  return updated.map((link) => link.id);
}

export async function removeLinkFromCampaignForUser({
  campaignId,
  linkId,
  userId,
}: RemoveLinkFromCampaignInput): Promise<{ id: string } | null> {
  const [link] = await db
    .update(links)
    .set({ campaignId: null, updatedAt: new Date() })
    .where(
      and(
        eq(links.id, linkId),
        eq(links.userId, userId),
        eq(links.campaignId, campaignId),
      ),
    )
    .returning({ id: links.id });

  return link ?? null;
}

export async function upsertLinkPageForLink({
  brandName,
  countdownTarget,
  ctaColor,
  ctaText,
  description,
  linkId,
  ogImage,
  showCountdown,
  showQrCode,
  showSocialProof,
  theme,
  title,
}: UpsertLinkPageRecordInput): Promise<LinkPageRecord> {
  const now = new Date();
  const [page] = await db
    .insert(linkPages)
    .values({
      brandName,
      countdownTarget,
      ctaColor,
      ctaText,
      description,
      linkId,
      ogImage,
      showCountdown,
      showQrCode,
      showSocialProof,
      theme,
      title,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: linkPages.linkId,
      set: {
        brandName,
        countdownTarget,
        ctaColor,
        ctaText,
        description,
        ogImage,
        showCountdown,
        showQrCode,
        showSocialProof,
        theme,
        title,
        updatedAt: now,
      },
    })
    .returning({
      brandName: linkPages.brandName,
      countdownTarget: linkPages.countdownTarget,
      ctaColor: linkPages.ctaColor,
      ctaText: linkPages.ctaText,
      description: linkPages.description,
      id: linkPages.id,
      linkId: linkPages.linkId,
      ogImage: linkPages.ogImage,
      showCountdown: linkPages.showCountdown,
      showQrCode: linkPages.showQrCode,
      showSocialProof: linkPages.showSocialProof,
      theme: linkPages.theme,
      title: linkPages.title,
      updatedAt: linkPages.updatedAt,
    });

  if (!page) throw new Error("Unable to upsert link page.");

  return page;
}

export async function softDeleteLinkForUser(
  id: string,
  userId: string,
): Promise<{ id: string } | null> {
  const [link] = await db
    .update(links)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(links.id, id), eq(links.userId, userId)))
    .returning({ id: links.id });

  return link ?? null;
}

function buildListLinksWhere({
  campaignId,
  search,
  unassigned,
  userId,
}: Pick<ListLinksInput, "campaignId" | "search" | "unassigned" | "userId">): SQL {
  const filters: SQL[] = [eq(links.userId, userId)];

  if (unassigned) {
    filters.push(isNull(links.campaignId));
  } else if (campaignId) {
    filters.push(eq(links.campaignId, campaignId));
  }

  if (search) {
    const pattern = `%${search}%`;
    const searchFilter = or(
      ilike(links.slug, pattern),
      ilike(links.destinationUrl, pattern),
      ilike(links.title, pattern),
    );

    if (searchFilter) filters.push(searchFilter);
  }

  const where = and(...filters);
  if (!where) throw new Error("Unable to build link list filter.");

  return where;
}

function buildLinksCursorWhere(cursor: CreatedAtCursor): SQL | undefined {
  return or(
    lt(links.createdAt, cursor.createdAt),
    and(eq(links.createdAt, cursor.createdAt), lt(links.id, cursor.id)),
  );
}

export async function listLinksByUserId({
  campaignId,
  cursor,
  limit,
  page,
  search,
  unassigned,
  userId,
}: ListLinksInput): Promise<{
  items: ListedLink[];
  nextCursor: string | null;
  total: number;
}> {
  const where = buildListLinksWhere({ campaignId, search, unassigned, userId });
  const cursorWhere = cursor ? buildLinksCursorWhere(cursor) : undefined;
  const paginatedWhere = cursorWhere ? and(where, cursorWhere) : where;
  const offset = (page - 1) * limit;
  const rowLimit = cursor ? limit + 1 : limit;

  const [items, totalRows] = await Promise.all([
    db
      .select({
        campaignId: links.campaignId,
        clickCount: links.clickCount,
        createdAt: links.createdAt,
        destinationUrl: links.destinationUrl,
        hasLinkPage: links.hasLinkPage,
        id: links.id,
        isActive: links.isActive,
        slug: links.slug,
        title: links.title,
        updatedAt: links.updatedAt,
      })
      .from(links)
      .where(paginatedWhere)
      .orderBy(desc(links.createdAt), desc(links.id))
      .limit(rowLimit)
      .offset(cursor ? 0 : offset),
    db.select({ value: count() }).from(links).where(where),
  ]);
  const cursorPage = cursor ? getCursorPage(items, limit) : null;

  return {
    items: cursorPage?.items ?? items,
    nextCursor: cursorPage?.nextCursor ?? null,
    total: totalRows[0]?.value ?? 0,
  };
}

export async function listLinksWithTrendsByUserId({
  campaignId,
  cursor,
  limit,
  now = new Date(),
  page,
  search,
  unassigned,
  userId,
}: ListLinksWithTrendsInput): Promise<{
  items: ListedLinkWithTrend[];
  nextCursor: string | null;
  total: number;
}> {
  const linkResult = await listLinksByUserId({
    campaignId,
    cursor,
    limit,
    page,
    search,
    unassigned,
    userId,
  });
  const linkIds = linkResult.items.map((link) => link.id);

  if (linkIds.length === 0) return { ...linkResult, items: [] };

  const range = getLinkClickTrendRange(now);
  const clickDate = sql<string>`to_char(date_trunc('day', ${clickEvents.timestamp}), 'YYYY-MM-DD')`;
  const trendRows = await db
    .select({
      date: clickDate,
      linkId: clickEvents.linkId,
      totalClicks: count(),
    })
    .from(clickEvents)
    .where(and(
      inArray(clickEvents.linkId, linkIds),
      inArray(clickEvents.eventType, ["DIRECT_REDIRECT", "LINK_PAGE_CTA_CLICK"]),
      gte(clickEvents.timestamp, range.from),
      lte(clickEvents.timestamp, range.to),
    ))
    .groupBy(clickEvents.linkId, clickDate);
  const trendsByLinkId = new Map<string, Map<string, number>>();

  for (const row of trendRows) {
    const trend = trendsByLinkId.get(row.linkId) ?? new Map<string, number>();
    trend.set(row.date, Number(row.totalClicks));
    trendsByLinkId.set(row.linkId, trend);
  }

  return {
    ...linkResult,
    items: linkResult.items.map((link) => {
      const trend = trendsByLinkId.get(link.id);
      const clickTrend = range.dates.map((date) => ({
        date,
        totalClicks: trend?.get(date) ?? 0,
      }));

      return {
        ...link,
        clickTrend,
        clicksLast7Days: clickTrend.reduce(
          (total, point) => total + point.totalClicks,
          0,
        ),
      };
    }),
  };
}

export function sortQrCodeLinks(
  items: ListedQrCodeLink[],
  sort: QrCodeSort = "recently-created",
): ListedQrCodeLink[] {
  return [...items].sort((a, b) => {
    if (sort === "most-scanned") {
      return (
        b.qrScanCount - a.qrScanCount ||
        b.qrScansLast30Days - a.qrScansLast30Days ||
        b.createdAt.getTime() - a.createdAt.getTime()
      );
    }

    return b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id);
  });
}

export async function listQrCodeLinksByUserId({
  cursor,
  limit,
  now = new Date(),
  page,
  search,
  sort = "recently-created",
  userId,
}: ListQrCodeLinksInput): Promise<{
  items: ListedQrCodeLink[];
  nextCursor: string | null;
  total: number;
}> {
  const linkResult = await listLinksByUserId({
    cursor,
    limit,
    page,
    search,
    userId,
  });
  const linkIds = linkResult.items.map((link) => link.id);

  if (linkIds.length === 0) return { ...linkResult, items: [] };

  const from = new Date(
    startOfUtcDay(now).getTime() - (QR_SCAN_WINDOW_DAYS - 1) * DAY_MS,
  );
  const scansLast30Days =
    sql<number>`count(*) filter (where ${clickEvents.timestamp} >= ${from})`.mapWith(
      Number,
    );
  const scanRows = await db
    .select({
      lastScanAt: sql<Date | null>`max(${clickEvents.timestamp})`,
      linkId: clickEvents.linkId,
      qrScanCount: count(clickEvents.id),
      qrScansLast30Days: scansLast30Days,
    })
    .from(clickEvents)
    .where(and(
      inArray(clickEvents.linkId, linkIds),
      eq(clickEvents.referrer, QR_SCAN_REFERRER),
      lte(clickEvents.timestamp, now),
    ))
    .groupBy(clickEvents.linkId);
  const scansByLinkId = new Map(
    scanRows.map((row) => [
      row.linkId,
      {
        lastScanAt: row.lastScanAt ? new Date(row.lastScanAt) : null,
        qrScanCount: Number(row.qrScanCount),
        qrScansLast30Days: Number(row.qrScansLast30Days),
      },
    ]),
  );
  const items = linkResult.items.map((link) => {
    const scans = scansByLinkId.get(link.id);

    return {
      ...link,
      lastScanAt: scans?.lastScanAt ?? null,
      qrScanCount: scans?.qrScanCount ?? 0,
      qrScansLast30Days: scans?.qrScansLast30Days ?? 0,
    };
  });

  return {
    ...linkResult,
    items: sortQrCodeLinks(items, sort),
  };
}

function buildLinkPagesCursorWhere(cursor: CreatedAtCursor): SQL | undefined {
  return or(
    lt(linkPages.createdAt, cursor.createdAt),
    and(eq(linkPages.createdAt, cursor.createdAt), lt(linkPages.id, cursor.id)),
  );
}

async function hydrateListedLinkPages(
  pages: Array<{
    brandName: string;
    countdownTarget: Date | null;
    createdAt: Date;
    ctaText: string;
    hasLinkPage: boolean;
    id: string;
    isLinkActive: boolean;
    linkId: string;
    showCountdown: boolean | null;
    showQrCode: boolean | null;
    slug: string;
    title: string;
    updatedAt: Date;
  }>,
): Promise<ListedLinkPage[]> {
  if (pages.length === 0) return [];

  const linkIds = pages.map((page) => page.linkId);
  const range = getLinkPageTrendRange();
  const clickDate = sql<string>`to_char(date_trunc('day', ${clickEvents.timestamp}), 'YYYY-MM-DD')`;
  const [eventCounts, trendRows] = await Promise.all([
    db
      .select({
        eventType: clickEvents.eventType,
        linkId: clickEvents.linkId,
        value: count(),
      })
      .from(clickEvents)
      .where(
        and(
          inArray(
            clickEvents.eventType,
            ["LINK_PAGE_VIEW", "LINK_PAGE_CTA_CLICK"],
          ),
          inArray(clickEvents.linkId, linkIds),
        ),
      )
      .groupBy(clickEvents.linkId, clickEvents.eventType),
    db
      .select({
        date: clickDate,
        linkId: clickEvents.linkId,
        pageViews: count(),
      })
      .from(clickEvents)
      .where(
        and(
          eq(clickEvents.eventType, "LINK_PAGE_VIEW"),
          inArray(clickEvents.linkId, linkIds),
          gte(clickEvents.timestamp, range.from),
          lte(clickEvents.timestamp, range.to),
        ),
      )
      .groupBy(clickEvents.linkId, clickDate),
  ]);

  const countsByLinkId = new Map<
    string,
    { ctaClicks: number; pageViews: number }
  >();

  for (const eventCount of eventCounts) {
    const counts = countsByLinkId.get(eventCount.linkId) ?? {
      ctaClicks: 0,
      pageViews: 0,
    };

    if (eventCount.eventType === "LINK_PAGE_CTA_CLICK") {
      counts.ctaClicks = Number(eventCount.value);
    }

    if (eventCount.eventType === "LINK_PAGE_VIEW") {
      counts.pageViews = Number(eventCount.value);
    }

    countsByLinkId.set(eventCount.linkId, counts);
  }

  const trendsByLinkId = new Map<string, Map<string, number>>();

  for (const row of trendRows) {
    const trend = trendsByLinkId.get(row.linkId) ?? new Map<string, number>();
    trend.set(row.date, Number(row.pageViews));
    trendsByLinkId.set(row.linkId, trend);
  }

  return pages.map((page) => {
    const counts = countsByLinkId.get(page.linkId) ?? {
      ctaClicks: 0,
      pageViews: 0,
    };
    const trend = trendsByLinkId.get(page.linkId);
    const clickTrend = range.dates.map((date) => ({
      date,
      pageViews: trend?.get(date) ?? 0,
    }));
    const pageViewsLast7Days = clickTrend.reduce(
      (total, point) => total + point.pageViews,
      0,
    );

    return {
      brandName: page.brandName,
      clickTrend,
      createdAt: page.createdAt,
      ctaClickThroughRate: getClickThroughRate(counts.ctaClicks, counts.pageViews),
      ctaClicks: counts.ctaClicks,
      ctaText: page.ctaText,
      hasCountdown: page.showCountdown === true && page.countdownTarget !== null,
      id: page.id,
      isActive: page.hasLinkPage && page.isLinkActive,
      linkId: page.linkId,
      pageViews: counts.pageViews,
      pageViewsLast7Days,
      showQrCode: page.showQrCode ?? true,
      slug: page.slug,
      title: page.title,
      updatedAt: page.updatedAt,
    };
  });
}

export function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}
