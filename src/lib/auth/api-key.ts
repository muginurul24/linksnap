import { createHash, randomBytes } from "node:crypto";
import {
  findApiKeyAuthByHash,
  touchApiKeyLastUsedAt,
} from "@/lib/db/queries/api-keys";
import type { UserPlan } from "@/lib/links/limits";
import {
  API_KEY_PREFIX,
  API_KEY_RANDOM_BYTES,
  getApiKeyDisplayPrefix,
  getBearerApiKey,
  isApiKey,
  maskApiKey,
} from "@/lib/auth/api-key-format";

export type ApiKeyAuthenticatedUser = {
  apiKeyId: string;
  authType: "apiKey";
  userId: string;
  userPlan: Extract<UserPlan, "PRO" | "BUSINESS">;
};

export function canUseApiKeys(
  plan: UserPlan | null | undefined,
): plan is Extract<UserPlan, "PRO" | "BUSINESS"> {
  return plan === "PRO" || plan === "BUSINESS";
}

export function generateApiKey(): string {
  return `${API_KEY_PREFIX}${randomBytes(API_KEY_RANDOM_BYTES).toString("base64url")}`;
}

export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

export async function validateApiKey(
  apiKey: string,
): Promise<ApiKeyAuthenticatedUser | null> {
  if (!isApiKey(apiKey)) return null;

  const record = await findApiKeyAuthByHash(hashApiKey(apiKey));
  if (!record || !canUseApiKeys(record.userPlan)) return null;

  await touchApiKeyLastUsedAt(record.id);

  return {
    apiKeyId: record.id,
    authType: "apiKey",
    userId: record.userId,
    userPlan: record.userPlan,
  };
}

export async function authenticateApiKeyRequest(
  request: Request,
): Promise<ApiKeyAuthenticatedUser | null> {
  const apiKey = getBearerApiKey(request.headers.get("authorization"));
  if (!apiKey) return null;

  return validateApiKey(apiKey);
}

export { getApiKeyDisplayPrefix, getBearerApiKey, maskApiKey };
