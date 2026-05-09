import {
  buildAdminAnalyticsVersionKey,
  buildDashboardAnalyticsGlobalVersionKey,
  buildDashboardAnalyticsUserVersionKey,
  buildSmartRulesCacheKey,
  CACHE_VERSION_TTL_SECONDS,
} from "@/lib/cache/keys";
import { getRedirectCacheKey } from "@/lib/links/redirect";
import { logger } from "@/lib/observability/logger";
import { deleteDashboardSubscriptionSnapshot } from "@/lib/payments/dashboard-subscription-cache";
import { cacheDelete, cacheSet } from "@/lib/redis";

type CacheInvalidationContext = {
  reason: string;
  requestId?: string;
};

type UserScopedInvalidationInput = CacheInvalidationContext & {
  userId: string;
};

type SlugScopedInvalidationInput = UserScopedInvalidationInput & {
  slugs: string[];
};

function nextVersionToken(): string {
  return Date.now().toString(36);
}

async function safeCacheDelete(
  key: string,
  context: CacheInvalidationContext,
): Promise<void> {
  try {
    await cacheDelete(key);
  } catch (error) {
    logger.error("cache_invalidation_delete_failed", {
      error,
      key,
      reason: context.reason,
      requestId: context.requestId,
    });
  }
}

async function safeCacheSet(
  key: string,
  value: string,
  context: CacheInvalidationContext,
): Promise<void> {
  try {
    await cacheSet(key, value, CACHE_VERSION_TTL_SECONDS);
  } catch (error) {
    logger.error("cache_invalidation_version_write_failed", {
      error,
      key,
      reason: context.reason,
      requestId: context.requestId,
    });
  }
}

async function bumpVersionKey(
  key: string,
  context: CacheInvalidationContext,
): Promise<void> {
  await safeCacheSet(key, nextVersionToken(), context);
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

async function bumpDashboardAnalyticsForUser({
  reason,
  requestId,
  userId,
}: UserScopedInvalidationInput): Promise<void> {
  await bumpVersionKey(buildDashboardAnalyticsUserVersionKey(userId), {
    reason,
    requestId,
  });
}

async function bumpAdminAnalytics(
  context: CacheInvalidationContext,
): Promise<void> {
  await bumpVersionKey(buildAdminAnalyticsVersionKey(), context);
}

export async function invalidateLinkCreateCaches(
  input: UserScopedInvalidationInput,
): Promise<void> {
  await Promise.all([
    bumpDashboardAnalyticsForUser(input),
    bumpAdminAnalytics(input),
  ]);
}

export async function invalidateLinkMutationCaches({
  reason,
  requestId,
  slugs,
  userId,
}: SlugScopedInvalidationInput): Promise<void> {
  const context = { reason, requestId };
  await Promise.all([
    ...uniqueValues(slugs).map((slug) =>
      safeCacheDelete(getRedirectCacheKey(slug), context),
    ),
    bumpDashboardAnalyticsForUser({ reason, requestId, userId }),
    bumpAdminAnalytics(context),
  ]);
}

export async function invalidateLinkPageCaches(
  input: SlugScopedInvalidationInput,
): Promise<void> {
  await invalidateLinkMutationCaches(input);
}

export async function invalidateSmartRuleCaches({
  reason,
  requestId,
  slugs,
  userId,
}: SlugScopedInvalidationInput): Promise<void> {
  const context = { reason, requestId };
  await Promise.all([
    ...uniqueValues(slugs).flatMap((slug) => [
      safeCacheDelete(getRedirectCacheKey(slug), context),
      safeCacheDelete(buildSmartRulesCacheKey(slug), context),
    ]),
    bumpDashboardAnalyticsForUser({ reason, requestId, userId }),
    bumpAdminAnalytics(context),
  ]);
}

export async function invalidateClickQueueProcessingCaches({
  processed,
  reason,
  requestId,
}: CacheInvalidationContext & {
  processed: number;
}): Promise<void> {
  if (processed <= 0) return;

  await Promise.all([
    bumpVersionKey(buildDashboardAnalyticsGlobalVersionKey(), {
      reason,
      requestId,
    }),
    bumpAdminAnalytics({ reason, requestId }),
  ]);
}

export async function invalidateSubscriptionCaches(
  input: UserScopedInvalidationInput,
): Promise<void> {
  await Promise.all([
    deleteDashboardSubscriptionSnapshot(input.userId),
    bumpDashboardAnalyticsForUser(input),
    bumpAdminAnalytics(input),
  ]);
}

export async function invalidateAdminPlanOverrideCaches(
  input: UserScopedInvalidationInput,
): Promise<void> {
  await invalidateSubscriptionCaches(input);
}
