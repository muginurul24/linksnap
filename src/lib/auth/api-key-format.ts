export const API_KEY_PREFIX = "lsnap_sk_";
export const API_KEY_RANDOM_BYTES = 32;
export const API_KEY_SECRET_LENGTH = 43;
export const API_KEY_DISPLAY_SECRET_CHARS = 8;

export const API_KEY_PATTERN = new RegExp(
  `^${API_KEY_PREFIX}[A-Za-z0-9_-]{${API_KEY_SECRET_LENGTH}}$`,
);

export function isApiKey(value: string): boolean {
  return API_KEY_PATTERN.test(value);
}

export function getApiKeyDisplayPrefix(apiKey: string): string {
  if (!isApiKey(apiKey)) {
    throw new Error("Invalid API key format.");
  }

  return apiKey.slice(0, API_KEY_PREFIX.length + API_KEY_DISPLAY_SECRET_CHARS);
}

export function maskApiKey(apiKey: string): string {
  return `${getApiKeyDisplayPrefix(apiKey)}...${apiKey.slice(-4)}`;
}

export function getBearerApiKey(authorization: string | null): string | null {
  const trimmed = authorization?.trim();
  if (!trimmed) return null;

  const match = /^Bearer\s+(.+)$/i.exec(trimmed);
  const token = match?.[1]?.trim();

  if (!token || /\s/.test(token) || !isApiKey(token)) return null;

  return token;
}

export function hasApiKeyBearerAuthorization(authorization: string | null): boolean {
  return getBearerApiKey(authorization) !== null;
}
