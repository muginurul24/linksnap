import { describe, expect, it } from "vitest";
import {
  API_DOCS_LOGIN_URL,
  API_DOCS_UPGRADE_URL,
  canAccessApiDocs,
  getApiDocsPageRedirect,
} from "../../src/lib/api-docs/access";

describe("api docs access", () => {
  it("should redirect unauthenticated users to login", () => {
    expect(getApiDocsPageRedirect({ plan: null, userId: null })).toBe(
      API_DOCS_LOGIN_URL,
    );
  });

  it("should redirect free users to billing upgrade prompt", () => {
    expect(getApiDocsPageRedirect({ plan: "FREE", userId: "user-1" })).toBe(
      API_DOCS_UPGRADE_URL,
    );
  });

  it("should allow paid users", () => {
    expect(canAccessApiDocs("PRO")).toBe(true);
    expect(canAccessApiDocs("BUSINESS")).toBe(true);
    expect(getApiDocsPageRedirect({ plan: "PRO", userId: "user-1" })).toBeNull();
    expect(
      getApiDocsPageRedirect({ plan: "BUSINESS", userId: "user-1" }),
    ).toBeNull();
  });
});
