import { describe, expect, it } from "vitest";
import {
  canUseApiKeys,
  generateApiKey,
  getApiKeyDisplayPrefix,
  getBearerApiKey,
  hashApiKey,
  maskApiKey,
} from "../../src/lib/auth/api-key";

const VALID_API_KEY = `lsnap_sk_${"a".repeat(43)}`;

describe("API key helpers", () => {
  it("should generate LinkSnap API keys with the expected prefix and entropy", () => {
    const key = generateApiKey();

    expect(key).toMatch(/^lsnap_sk_[A-Za-z0-9_-]{43}$/);
    expect(maskApiKey(key)).toMatch(/^lsnap_sk_[A-Za-z0-9_-]{8}\.\.\.[A-Za-z0-9_-]{4}$/);
  });

  it("should hash API keys without preserving plaintext", () => {
    const hash = hashApiKey(VALID_API_KEY);

    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(VALID_API_KEY);
    expect(hashApiKey(VALID_API_KEY)).toBe(hash);
  });

  it("should derive display prefixes and masked values from valid keys", () => {
    expect(getApiKeyDisplayPrefix(VALID_API_KEY)).toBe("lsnap_sk_aaaaaaaa");
    expect(maskApiKey(VALID_API_KEY)).toBe("lsnap_sk_aaaaaaaa...aaaa");
  });

  it("should parse bearer API key authorization headers", () => {
    expect(getBearerApiKey(`Bearer ${VALID_API_KEY}`)).toBe(VALID_API_KEY);
    expect(getBearerApiKey(`bearer ${VALID_API_KEY}`)).toBe(VALID_API_KEY);
    expect(getBearerApiKey(null)).toBeNull();
    expect(getBearerApiKey("Basic abc")).toBeNull();
    expect(getBearerApiKey("Bearer not-a-linksnap-key")).toBeNull();
  });

  it("should gate API key management to paid plans", () => {
    expect(canUseApiKeys("FREE")).toBe(false);
    expect(canUseApiKeys("PRO")).toBe(true);
    expect(canUseApiKeys("BUSINESS")).toBe(true);
  });
});
