import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { buildShortUrl, getBaseUrl } from "@/lib/api/base-url";

const previousPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL;

function createRequest(): NextRequest {
  return new NextRequest("https://request-origin.test/api/v1/links");
}

describe("base URL helpers", () => {
  afterEach(() => {
    if (previousPublicAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
      return;
    }

    process.env.NEXT_PUBLIC_APP_URL = previousPublicAppUrl;
  });

  it("should prefer configured public app URL without trailing slash", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://linksnap.test/";

    expect(getBaseUrl(createRequest())).toBe("https://linksnap.test");
    expect(buildShortUrl(createRequest(), "promo")).toBe(
      "https://linksnap.test/promo",
    );
  });

  it("should fall back to request origin", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(getBaseUrl(createRequest())).toBe("https://request-origin.test");
    expect(buildShortUrl(createRequest(), "promo")).toBe(
      "https://request-origin.test/promo",
    );
  });
});
