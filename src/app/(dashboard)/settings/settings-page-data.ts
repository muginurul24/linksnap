import {
  listApiKeysByUserId,
  type ApiKeyListItem,
} from "@/lib/db/queries/api-keys";
import { findBillingUserById } from "@/lib/db/queries/payments";
import {
  findSettingsUserById,
  type SettingsUser,
} from "@/lib/db/queries/settings";
import type { UserPlan } from "@/lib/links/limits";
import { logger } from "@/lib/observability/logger";

export type SettingsPageData =
  | {
      apiKeys: ApiKeyListItem[];
      plan: UserPlan;
      settingsUser: SettingsUser;
      status: "ready";
    }
  | {
      apiKeys: [];
      message: string;
      plan: UserPlan;
      settingsUser: null;
      status: "error";
    };

export function canManageApiKeys(plan: UserPlan): boolean {
  return plan === "PRO" || plan === "BUSINESS";
}

export async function loadSettingsPageData(userId: string): Promise<SettingsPageData> {
  try {
    const [billingUser, settingsUser] = await Promise.all([
      findBillingUserById(userId),
      findSettingsUserById(userId),
    ]);
    const plan = billingUser?.plan ?? "FREE";

    if (!settingsUser) {
      return {
        apiKeys: [],
        message: "Unable to load your settings. Sign in again to continue.",
        plan,
        settingsUser: null,
        status: "error",
      };
    }

    const apiKeys = canManageApiKeys(plan)
      ? await listApiKeysByUserId(userId)
      : [];

    return {
      apiKeys,
      plan,
      settingsUser,
      status: "ready",
    };
  } catch (error) {
    logger.error("settings_page_data_load_failed", { error, userId });

    return {
      apiKeys: [],
      message: "Settings are temporarily unavailable. Try refreshing the page.",
      plan: "FREE",
      settingsUser: null,
      status: "error",
    };
  }
}
