import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { links, users } from "@/lib/db/schema";
import type { UserPlan } from "@/lib/links/limits";

export type CreatedLink = {
  destinationUrl: string;
  id: string;
  slug: string;
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

export type LinkDetail = ListedLink & {
  expiresAt: Date | null;
  scheduledAt: Date | null;
  userId: string;
};

type ListLinksInput = {
  campaignId?: string;
  limit: number;
  page: number;
  search?: string;
  userId: string;
};

type UpdateLinkRecordInput = {
  destinationUrl?: string;
  id: string;
  slug?: string;
  title?: string | null;
  userId: string;
};

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

export async function getUserPlanById(userId: string): Promise<UserPlan | null> {
  const user = await db.query.users.findFirst({
    columns: { plan: true },
    where: eq(users.id, userId),
  });

  return user?.plan ?? null;
}

export async function countLinksByUserId(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(links)
    .where(eq(links.userId, userId));

  return row?.value ?? 0;
}

export async function findLinkBySlug(slug: string): Promise<{ id: string } | null> {
  const link = await db.query.links.findFirst({
    columns: { id: true },
    where: eq(links.slug, slug),
  });

  return link ?? null;
}

export async function findLinkById(id: string): Promise<LinkDetail | null> {
  const link = await db.query.links.findFirst({
    columns: linkDetailColumns,
    where: eq(links.id, id),
  });

  return link ?? null;
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
  userId,
}: Pick<ListLinksInput, "campaignId" | "search" | "userId">): SQL {
  const filters: SQL[] = [eq(links.userId, userId)];

  if (campaignId) {
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

export async function listLinksByUserId({
  campaignId,
  limit,
  page,
  search,
  userId,
}: ListLinksInput): Promise<{ items: ListedLink[]; total: number }> {
  const where = buildListLinksWhere({ campaignId, search, userId });
  const offset = (page - 1) * limit;

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
      .where(where)
      .orderBy(desc(links.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(links).where(where),
  ]);

  return {
    items,
    total: totalRows[0]?.value ?? 0,
  };
}

export function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}
