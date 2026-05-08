import { describe, expect, it } from "vitest";
import {
  getSessionRole,
  getSessionString,
  getSessionUserId,
} from "../../src/lib/auth/session-helpers";

describe("session helpers", () => {
  it("should return null for missing sessions", () => {
    expect(getSessionUserId(null)).toBeNull();
    expect(getSessionRole(null)).toBeNull();
    expect(getSessionString(null, "email")).toBeNull();
  });

  it("should extract string user fields safely", () => {
    const session = {
      expires: "2026-05-08T10:00:00.000Z",
      user: {
        email: "user@example.com",
        id: "user-1",
        role: "superadmin",
      },
    };

    expect(getSessionUserId(session)).toBe("user-1");
    expect(getSessionRole(session)).toBe("superadmin");
    expect(getSessionString(session, "email")).toBe("user@example.com");
    expect(getSessionString(session, "expires")).toBe("2026-05-08T10:00:00.000Z");
  });

  it("should ignore non-string values", () => {
    const session = {
      expires: 123,
      user: {
        email: null,
        id: 123,
        role: false,
      },
    };

    expect(getSessionUserId(session)).toBeNull();
    expect(getSessionRole(session)).toBeNull();
    expect(getSessionString(session, "email")).toBeNull();
    expect(getSessionString(session, "expires")).toBeNull();
  });
});
