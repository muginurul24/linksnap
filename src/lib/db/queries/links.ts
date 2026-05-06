import { count, eq } from "drizzle-orm";
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

export function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}
