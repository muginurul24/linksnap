import { beforeEach, describe, expect, it, vi } from "vitest";

type MockSession = {
  user?: {
    id?: string;
  } | null;
} | null;

const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
);

const mockState = vi.hoisted(() => ({
  session: null as MockSession,
  verificationUser: null as null | {
    emailVerified: Date | null;
    id: string;
  },
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/auth", () => ({
  auth: async () => mockState.session,
}));

vi.mock("@/lib/db/queries/users", () => ({
  findUserVerificationStatusById: async () => mockState.verificationUser,
}));

import ForgotPasswordPage from "../../src/app/(marketing)/forgot-password/page";
import LoginPage from "../../src/app/(marketing)/login/page";
import RegisterPage from "../../src/app/(marketing)/register/page";
import ResetPasswordPage from "../../src/app/(marketing)/reset-password/page";
import VerifyPage from "../../src/app/(marketing)/verify/page";

async function expectDashboardRedirect(page: () => Promise<unknown>) {
  await expect(page()).rejects.toMatchObject({
    message: "NEXT_REDIRECT",
    url: "/dashboard",
  });
}

describe("auth page redirects", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    mockState.session = null;
    mockState.verificationUser = null;
  });

  it("should redirect logged-in users away from login", async () => {
    mockState.session = { user: { id: "user-1" } };

    await expectDashboardRedirect(LoginPage);
  });

  it("should redirect logged-in users away from register", async () => {
    mockState.session = { user: { id: "user-1" } };

    await expectDashboardRedirect(RegisterPage);
  });

  it("should redirect logged-in users away from forgot password", async () => {
    mockState.session = { user: { id: "user-1" } };

    await expectDashboardRedirect(ForgotPasswordPage);
  });

  it("should redirect logged-in users away from reset password", async () => {
    mockState.session = { user: { id: "user-1" } };

    await expectDashboardRedirect(() =>
      ResetPasswordPage({
        searchParams: Promise.resolve({ token: "reset-token" }),
      }),
    );
  });

  it("should redirect verified logged-in users away from verify", async () => {
    mockState.session = { user: { id: "user-1" } };
    mockState.verificationUser = {
      emailVerified: new Date("2026-05-07T00:00:00.000Z"),
      id: "user-1",
    };

    await expectDashboardRedirect(VerifyPage);
  });

  it("should allow unverified logged-in users to open verify", async () => {
    mockState.session = { user: { id: "user-1" } };
    mockState.verificationUser = {
      emailVerified: null,
      id: "user-1",
    };

    await expect(VerifyPage()).resolves.toBeTruthy();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("should allow anonymous users to open auth pages", async () => {
    await expect(LoginPage()).resolves.toBeTruthy();
    await expect(RegisterPage()).resolves.toBeTruthy();
    await expect(ForgotPasswordPage()).resolves.toBeTruthy();
    await expect(
      ResetPasswordPage({
        searchParams: Promise.resolve({ token: "reset-token" }),
      }),
    ).resolves.toBeTruthy();
    await expect(VerifyPage()).resolves.toBeTruthy();
  });
});
