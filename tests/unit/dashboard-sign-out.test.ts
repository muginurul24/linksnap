import { describe, expect, it, vi } from "vitest";
import {
  SIGN_OUT_CALLBACK_URL,
  signOutToLanding,
} from "../../src/components/dashboard/sign-out";

describe("dashboard sign out", () => {
  it("should redirect to landing page when signing out", () => {
    const signOut = vi.fn();

    signOutToLanding(signOut);

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledWith({
      callbackUrl: SIGN_OUT_CALLBACK_URL,
    });
  });
});
