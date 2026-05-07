import { afterEach, describe, expect, it } from "vitest";
import {
  buildPaymentRedirectUrls,
  getConfiguredPaymentBaseUrl,
  normalizePaymentBaseUrl,
} from "../../src/lib/payments/redirects";

const previousAppUrl = process.env.APP_URL;
const previousPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL;

function restoreEnv(key: "APP_URL" | "NEXT_PUBLIC_APP_URL", value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

afterEach(() => {
  restoreEnv("APP_URL", previousAppUrl);
  restoreEnv("NEXT_PUBLIC_APP_URL", previousPublicAppUrl);
});

describe("payment redirect URLs", () => {
  it("should normalize configured base URLs", () => {
    expect(normalizePaymentBaseUrl(" https://www.justqiu.cloud/// ")).toBe(
      "https://www.justqiu.cloud",
    );
    expect(normalizePaymentBaseUrl("javascript:alert(1)")).toBe(
      "https://www.justqiu.cloud",
    );
    expect(normalizePaymentBaseUrl("   ")).toBe("https://www.justqiu.cloud");
  });

  it("should prefer APP_URL before NEXT_PUBLIC_APP_URL", () => {
    process.env.APP_URL = "https://app.linksnap.test/";
    process.env.NEXT_PUBLIC_APP_URL = "https://public.linksnap.test/";

    expect(getConfiguredPaymentBaseUrl()).toBe("https://app.linksnap.test");
  });

  it("should build finish, error, and unfinish checkout URLs", () => {
    expect(
      buildPaymentRedirectUrls({
        baseUrl: "https://www.justqiu.cloud/",
        orderId: "LS-1777777777777-abcdef123456",
      }),
    ).toEqual({
      error:
        "https://www.justqiu.cloud/checkout/cancel?order_id=LS-1777777777777-abcdef123456&status=error",
      finish:
        "https://www.justqiu.cloud/checkout/success?order_id=LS-1777777777777-abcdef123456",
      unfinish:
        "https://www.justqiu.cloud/checkout/cancel?order_id=LS-1777777777777-abcdef123456&status=unfinish",
    });
  });
});
