import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKeys, users } from "@/lib/db/schema";
import type { UserPlan } from "@/lib/links/limits";

export type ApiKeyListItem = {
  createdAt: Date;
  id: string;
  keyPrefix: string;
  lastUsedAt: Date | null;
  name: string;
};

export type ApiKeyAuthRecord = {
  id: string;
  userId: string;
  userPlan: UserPlan;
};

type CreateApiKeyRecordInput = {
  keyHash: string;
  keyPrefix: string;
  name: string;
  userId: string;
};

export async function listApiKeysByUserId(
  userId: string,
): Promise<ApiKeyListItem[]> {
  return db
    .select({
      createdAt: apiKeys.createdAt,
      id: apiKeys.id,
      keyPrefix: apiKeys.keyPrefix,
      lastUsedAt: apiKeys.lastUsedAt,
      name: apiKeys.name,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(desc(apiKeys.createdAt));
}

export async function createApiKeyRecord({
  keyHash,
  keyPrefix,
  name,
  userId,
}: CreateApiKeyRecordInput): Promise<ApiKeyListItem> {
  const [apiKey] = await db
    .insert(apiKeys)
    .values({
      keyHash,
      keyPrefix,
      name,
      userId,
    })
    .returning({
      createdAt: apiKeys.createdAt,
      id: apiKeys.id,
      keyPrefix: apiKeys.keyPrefix,
      lastUsedAt: apiKeys.lastUsedAt,
      name: apiKeys.name,
    });

  if (!apiKey) throw new Error("Unable to create API key.");

  return apiKey;
}

export async function deleteApiKeyForUser({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<boolean> {
  const [deleted] = await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
    .returning({ id: apiKeys.id });

  return Boolean(deleted);
}

export async function findApiKeyAuthByHash(
  keyHash: string,
): Promise<ApiKeyAuthRecord | null> {
  const [record] = await db
    .select({
      id: apiKeys.id,
      userId: apiKeys.userId,
      userPlan: users.plan,
    })
    .from(apiKeys)
    .innerJoin(users, eq(apiKeys.userId, users.id))
    .where(eq(apiKeys.keyHash, keyHash));

  return record ?? null;
}

export async function touchApiKeyLastUsedAt(id: string): Promise<void> {
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, id));
}
