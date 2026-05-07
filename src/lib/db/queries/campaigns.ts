import { and, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { campaigns, links } from "@/lib/db/schema";
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

type ListCampaignsInput = {
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

async function countCampaignLinks(campaignId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(links)
    .where(eq(links.campaignId, campaignId));

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
  limit,
  page,
  search,
  userId,
}: ListCampaignsInput): Promise<{ items: CampaignWithLinkCount[]; total: number }> {
  const where = buildListCampaignsWhere({ search, userId });
  const offset = (page - 1) * limit;

  const [items, totalRows] = await Promise.all([
    db
      .select(campaignSelectColumns)
      .from(campaigns)
      .leftJoin(links, eq(links.campaignId, campaigns.id))
      .where(where)
      .groupBy(...getCampaignGroupByColumns())
      .orderBy(desc(campaigns.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(campaigns).where(where),
  ]);

  return {
    items,
    total: totalRows[0]?.value ?? 0,
  };
}

export async function findCampaignById(
  id: string,
): Promise<CampaignWithLinkCount | null> {
  const [campaign] = await db
    .select(campaignSelectColumns)
    .from(campaigns)
    .leftJoin(links, eq(links.campaignId, campaigns.id))
    .where(eq(campaigns.id, id))
    .groupBy(...getCampaignGroupByColumns())
    .limit(1);

  return campaign ?? null;
}

export async function findCampaignsBySlugsForUser({
  slugs,
  userId,
}: FindCampaignsBySlugsInput): Promise<CampaignWithLinkCount[]> {
  if (slugs.length === 0) return [];

  return db
    .select(campaignSelectColumns)
    .from(campaigns)
    .leftJoin(links, eq(links.campaignId, campaigns.id))
    .where(and(eq(campaigns.userId, userId), inArray(campaigns.slug, slugs)))
    .groupBy(...getCampaignGroupByColumns());
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
