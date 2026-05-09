import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lt,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/lib/db";
import { retryTransientDbQuery } from "@/lib/db/retry";
import { campaigns, clickEvents, links } from "@/lib/db/schema";
import { getCursorPage, type CreatedAtCursor } from "@/lib/pagination/cursor";
import type {
  CreateCampaignInput,
  UpdateCampaignInput,
} from "@/lib/validations/campaign";

export type CampaignRecord = {
  createdAt: Date;
  description: string | null;
  id: string;
  name: string;
  slug: string;
  updatedAt: Date;
  userId: string;
  utmCampaign: string | null;
  utmContent: string | null;
  utmMedium: string | null;
  utmSource: string | null;
  utmTerm: string | null;
};

export type CampaignWithLinkCount = CampaignRecord & {
  linkCount: number;
};

export type CampaignCardSort = "most-clicks" | "most-links" | "newest";

export type CampaignClickTrendPoint = {
  date: string;
  totalClicks: number;
};

export type CampaignCardMetrics = CampaignWithLinkCount & {
  clickTrend: CampaignClickTrendPoint[];
  clicksLast7Days: number;
  totalClicks: number;
};

type ListCampaignsInput = {
  cursor?: CreatedAtCursor;
  limit: number;
  page: number;
  search?: string;
  userId: string;
};

type UpdateCampaignRecordInput = UpdateCampaignInput & {
  id: string;
  userId: string;
};

type FindCampaignsBySlugsInput = {
  slugs: string[];
  userId: string;
};

type ListCampaignCardsInput = ListCampaignsInput & {
  now?: Date;
  sort?: CampaignCardSort;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const CAMPAIGN_CARD_TREND_DAYS = 7;

const campaignColumns = {
  createdAt: campaigns.createdAt,
  description: campaigns.description,
  id: campaigns.id,
  name: campaigns.name,
  slug: campaigns.slug,
  updatedAt: campaigns.updatedAt,
  userId: campaigns.userId,
  utmCampaign: campaigns.utmCampaign,
  utmContent: campaigns.utmContent,
  utmMedium: campaigns.utmMedium,
  utmSource: campaigns.utmSource,
  utmTerm: campaigns.utmTerm,
};

const campaignSelectColumns = {
  ...campaignColumns,
  linkCount: count(links.id),
};

function getCampaignGroupByColumns() {
  return [
    campaigns.id,
    campaigns.userId,
    campaigns.name,
    campaigns.slug,
    campaigns.description,
    campaigns.utmSource,
    campaigns.utmMedium,
    campaigns.utmCampaign,
    campaigns.utmTerm,
    campaigns.utmContent,
    campaigns.createdAt,
    campaigns.updatedAt,
  ];
}

function buildListCampaignsWhere({
  search,
  userId,
}: Pick<ListCampaignsInput, "search" | "userId">): SQL {
  const filters: SQL[] = [eq(campaigns.userId, userId)];

  if (search) {
    const pattern = `%${search}%`;
    const searchFilter = or(
      ilike(campaigns.name, pattern),
      ilike(campaigns.slug, pattern),
      ilike(campaigns.description, pattern),
    );

    if (searchFilter) filters.push(searchFilter);
  }

  const where = and(...filters);
  if (!where) throw new Error("Unable to build campaign list filter.");

  return where;
}

function buildCampaignsCursorWhere(cursor: CreatedAtCursor): SQL | undefined {
  return or(
    lt(campaigns.createdAt, cursor.createdAt),
    and(eq(campaigns.createdAt, cursor.createdAt), lt(campaigns.id, cursor.id)),
  );
}

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

function getCampaignCardTrendRange(now = new Date()): {
  dates: string[];
  from: Date;
  to: Date;
} {
  const to = now;
  const from = new Date(
    startOfUtcDay(now).getTime() - (CAMPAIGN_CARD_TREND_DAYS - 1) * DAY_MS,
  );
  const dates = Array.from({ length: CAMPAIGN_CARD_TREND_DAYS }, (_, index) =>
    formatUtcDate(new Date(from.getTime() + index * DAY_MS)),
  );

  return { dates, from, to };
}

function compareNewest(a: CampaignWithLinkCount, b: CampaignWithLinkCount): number {
  return b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id);
}

export function sortCampaignCardMetrics(
  items: CampaignCardMetrics[],
  sort: CampaignCardSort = "newest",
): CampaignCardMetrics[] {
  return [...items].sort((a, b) => {
    if (sort === "most-clicks") {
      return (
        b.totalClicks - a.totalClicks ||
        b.clicksLast7Days - a.clicksLast7Days ||
        compareNewest(a, b)
      );
    }

    if (sort === "most-links") {
      return (
        b.linkCount - a.linkCount ||
        b.totalClicks - a.totalClicks ||
        compareNewest(a, b)
      );
    }

    return compareNewest(a, b);
  });
}

async function countCampaignLinks(campaignId: string): Promise<number> {
  const [row] = await retryTransientDbQuery(() =>
    db
      .select({ value: count() })
      .from(links)
      .where(eq(links.campaignId, campaignId)),
  );

  return row?.value ?? 0;
}

export async function countCampaignsByUserId(userId: string): Promise<number> {
  const [row] = await retryTransientDbQuery(() =>
    db
      .select({ value: count() })
      .from(campaigns)
      .where(eq(campaigns.userId, userId)),
  );

  return row?.value ?? 0;
}

export async function createCampaignRecord({
  description,
  name,
  slug,
  userId,
  utmCampaign,
  utmContent,
  utmMedium,
  utmSource,
  utmTerm,
}: CreateCampaignInput & { userId: string }): Promise<CampaignRecord> {
  const [campaign] = await db
    .insert(campaigns)
    .values({
      description,
      name,
      slug,
      userId,
      utmCampaign,
      utmContent,
      utmMedium,
      utmSource,
      utmTerm,
    })
    .returning(campaignColumns);

  if (!campaign) throw new Error("Unable to create campaign record.");

  return campaign;
}

export async function listCampaignsByUserId({
  cursor,
  limit,
  page,
  search,
  userId,
}: ListCampaignsInput): Promise<{
  items: CampaignWithLinkCount[];
  nextCursor: string | null;
  total: number;
}> {
  const where = buildListCampaignsWhere({ search, userId });
  const cursorWhere = cursor ? buildCampaignsCursorWhere(cursor) : undefined;
  const paginatedWhere = cursorWhere ? and(where, cursorWhere) : where;
  const offset = (page - 1) * limit;
  const rowLimit = cursor ? limit + 1 : limit;

  const [items, totalRows] = await retryTransientDbQuery(() =>
    Promise.all([
      db
        .select(campaignSelectColumns)
        .from(campaigns)
        .leftJoin(links, eq(links.campaignId, campaigns.id))
        .where(paginatedWhere)
        .groupBy(...getCampaignGroupByColumns())
        .orderBy(desc(campaigns.createdAt), desc(campaigns.id))
        .limit(rowLimit)
        .offset(cursor ? 0 : offset),
      db.select({ value: count() }).from(campaigns).where(where),
    ]),
  );
  const cursorPage = cursor ? getCursorPage(items, limit) : null;

  return {
    items: cursorPage?.items ?? items,
    nextCursor: cursorPage?.nextCursor ?? null,
    total: totalRows[0]?.value ?? 0,
  };
}

export async function listCampaignCardsByUserId({
  cursor,
  limit,
  now = new Date(),
  page,
  search,
  sort = "newest",
  userId,
}: ListCampaignCardsInput): Promise<{
  items: CampaignCardMetrics[];
  nextCursor: string | null;
  total: number;
}> {
  const campaignResult = await listCampaignsByUserId({
    cursor,
    limit,
    page,
    search,
    userId,
  });
  const campaignIds = campaignResult.items.map((campaign) => campaign.id);

  if (campaignIds.length === 0) return { ...campaignResult, items: [] };

  const range = getCampaignCardTrendRange(now);
  const clickDate = sql<string>`to_char(date_trunc('day', ${clickEvents.timestamp}), 'YYYY-MM-DD')`;
  const clicksLast7Days =
    sql<number>`count(*) filter (where ${clickEvents.timestamp} >= ${range.from})`.mapWith(
      Number,
    );
  const [metricRows, trendRows] = await retryTransientDbQuery(() =>
    Promise.all([
      db
        .select({
          campaignId: links.campaignId,
          clicksLast7Days,
          totalClicks: count(clickEvents.id),
        })
        .from(clickEvents)
        .innerJoin(links, eq(clickEvents.linkId, links.id))
        .where(and(
          inArray(links.campaignId, campaignIds),
          lte(clickEvents.timestamp, range.to),
          ne(clickEvents.eventType, "LINK_PAGE_CTA_CLICK"),
        ))
        .groupBy(links.campaignId),
      db
        .select({
          campaignId: links.campaignId,
          date: clickDate,
          totalClicks: count(clickEvents.id),
        })
        .from(clickEvents)
        .innerJoin(links, eq(clickEvents.linkId, links.id))
        .where(and(
          inArray(links.campaignId, campaignIds),
          gte(clickEvents.timestamp, range.from),
          lte(clickEvents.timestamp, range.to),
          ne(clickEvents.eventType, "LINK_PAGE_CTA_CLICK"),
        ))
        .groupBy(links.campaignId, clickDate),
    ]),
  );
  const metricsByCampaign = new Map(
    metricRows.flatMap((row) =>
      row.campaignId
        ? [
            [
              row.campaignId,
              {
                clicksLast7Days: Number(row.clicksLast7Days),
                totalClicks: Number(row.totalClicks),
              },
            ] as const,
          ]
        : [],
    ),
  );
  const trendsByCampaign = new Map<string, Map<string, number>>();

  for (const row of trendRows) {
    if (!row.campaignId) continue;

    const trend = trendsByCampaign.get(row.campaignId) ?? new Map<string, number>();
    trend.set(row.date, Number(row.totalClicks));
    trendsByCampaign.set(row.campaignId, trend);
  }

  const items = campaignResult.items.map((campaign) => {
    const metrics = metricsByCampaign.get(campaign.id);
    const trend = trendsByCampaign.get(campaign.id);

    return {
      ...campaign,
      clickTrend: range.dates.map((date) => ({
        date,
        totalClicks: trend?.get(date) ?? 0,
      })),
      clicksLast7Days: metrics?.clicksLast7Days ?? 0,
      totalClicks: metrics?.totalClicks ?? 0,
    };
  });

  return {
    ...campaignResult,
    items: sortCampaignCardMetrics(items, sort),
  };
}

export async function findCampaignById(
  id: string,
): Promise<CampaignWithLinkCount | null> {
  const [campaign] = await retryTransientDbQuery(() =>
    db
      .select(campaignSelectColumns)
      .from(campaigns)
      .leftJoin(links, eq(links.campaignId, campaigns.id))
      .where(eq(campaigns.id, id))
      .groupBy(...getCampaignGroupByColumns())
      .limit(1),
  );

  return campaign ?? null;
}

export async function findCampaignsBySlugsForUser({
  slugs,
  userId,
}: FindCampaignsBySlugsInput): Promise<CampaignWithLinkCount[]> {
  if (slugs.length === 0) return [];

  return retryTransientDbQuery(() =>
    db
      .select(campaignSelectColumns)
      .from(campaigns)
      .leftJoin(links, eq(links.campaignId, campaigns.id))
      .where(and(eq(campaigns.userId, userId), inArray(campaigns.slug, slugs)))
      .groupBy(...getCampaignGroupByColumns()),
  );
}

export async function updateCampaignRecordForUser({
  description,
  id,
  name,
  slug,
  userId,
  utmCampaign,
  utmContent,
  utmMedium,
  utmSource,
  utmTerm,
}: UpdateCampaignRecordInput): Promise<CampaignWithLinkCount | null> {
  const [campaign] = await db
    .update(campaigns)
    .set({
      ...(description === undefined ? {} : { description }),
      ...(name === undefined ? {} : { name }),
      ...(slug === undefined ? {} : { slug }),
      ...(utmCampaign === undefined ? {} : { utmCampaign }),
      ...(utmContent === undefined ? {} : { utmContent }),
      ...(utmMedium === undefined ? {} : { utmMedium }),
      ...(utmSource === undefined ? {} : { utmSource }),
      ...(utmTerm === undefined ? {} : { utmTerm }),
      updatedAt: new Date(),
    })
    .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)))
    .returning(campaignColumns);

  if (!campaign) return null;

  return {
    ...campaign,
    linkCount: await countCampaignLinks(campaign.id),
  };
}

export async function deleteCampaignForUser({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<{ id: string } | null> {
  const [campaign] = await db
    .delete(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)))
    .returning({ id: campaigns.id });

  return campaign ?? null;
}

export function isUniqueCampaignConstraintViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}
