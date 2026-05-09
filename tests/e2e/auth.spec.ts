import { expect, test, type Page } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { users } from "../../src/lib/db/schema";
import { redis } from "../../src/lib/redis";
import { retryTransientDb } from "./db-retry";

loadEnvConfig(process.cwd());

const authEmailFile = join(process.cwd(), ".e2e/auth-emails.jsonl");
const testIp = "198.51.100.27";

test.setTimeout(60_000);

type VerificationEmailRecord = {
  otp: string;
  to: string;
  type: "verification";
};

type CsrfResponse = {
  csrfToken?: string;
};

function isVerificationEmailRecord(
  value: unknown,
): value is VerificationEmailRecord {
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;
  return (
    record.type === "verification" &&
    typeof record.to === "string" &&
    typeof record.otp === "string" &&
    /^\d{6}$/.test(record.otp)
  );
}

async function resetAuthEmailFile(): Promise<void> {
  await mkdir(dirname(authEmailFile), { recursive: true });
  await writeFile(authEmailFile, "", "utf8");
}

async function readOtpForEmail(email: string): Promise<string | null> {
  const content = await readFile(authEmailFile, "utf8").catch(() => "");
  const records = content
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as unknown)
    .filter(isVerificationEmailRecord)
    .filter((record) => record.to === email);

  return records.at(-1)?.otp ?? null;
}

async function waitForOtp(email: string): Promise<string> {
  await expect
    .poll(() => readOtpForEmail(email), {
      message: "verification email should be written to the E2E email file",
      timeout: 10_000,
    })
    .toMatch(/^\d{6}$/);

  const otp = await readOtpForEmail(email);
  if (!otp) {
    throw new Error("Verification OTP was not found after polling.");
  }

  return otp;
}

async function cleanupAuthState(email: string): Promise<void> {
  await retryTransientDb(() => db.delete(users).where(eq(users.email, email)));
  await redis.del(
    `rate-limit:auth:login:${testIp}`,
    "rate-limit:auth:login:unknown",
    `rate-limit:auth:register:${testIp}`,
    "rate-limit:auth:register:unknown",
    `rate-limit:auth:resend-otp:${email}`,
  );
}

async function submitRegisterForm(page: Page): Promise<void> {
  let lastStatus = 0;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const registerResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/auth/register") &&
        response.request().method() === "POST",
      { timeout: 20_000 },
    );

    await page.getByRole("button", { name: "Create account" }).click();
    const registerResponse = await registerResponsePromise;
    lastStatus = registerResponse.status();
    if (registerResponse.ok()) return;

    await page.waitForTimeout(attempt * 500);
  }

  expect(lastStatus).toBeGreaterThanOrEqual(200);
  expect(lastStatus).toBeLessThan(300);
}

test.use({
  extraHTTPHeaders: {
    "x-forwarded-for": testIp,
  },
});

test("should register verify login access dashboard and logout", async ({ page }) => {
  const email = `e2e-auth-${Date.now()}@example.com`;
  const password = "Password1";
  const encodedEmail = encodeURIComponent(email);

  await resetAuthEmailFile();
  await cleanupAuthState(email);

  try {
    await page.goto("/links");
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Flinks$/);

    await page.getByRole("link", { name: "Create one" }).click();
    await expect(page).toHaveURL(/\/register$/, { timeout: 15_000 });
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password").fill(password);
    await submitRegisterForm(page);

    await expect(page).toHaveURL(new RegExp(`/verify\\?email=${encodedEmail}`), {
      timeout: 15_000,
    });

    const otp = await waitForOtp(email);
    const verifyResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/auth/verify") &&
        response.request().method() === "POST",
      { timeout: 30_000 },
    );
    await page.getByLabel("Verification code").fill(otp);
    const verifyResponse = await verifyResponsePromise;
    expect(verifyResponse.ok()).toBe(true);

    await expect(page).toHaveURL(/\/login\?verified=true$/, { timeout: 15_000 });
    await expect(
      page.getByRole("main").getByText("Email verified. You can sign in now."),
    ).toBeVisible();

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    const credentialsResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/auth/callback/credentials") &&
        response.request().method() === "POST",
      { timeout: 45_000 },
    );

    await page.getByRole("button", { name: /^Sign in$/ }).click();
    const credentialsResponse = await credentialsResponsePromise;
    expect(credentialsResponse.ok()).toBe(true);

    await expect(page).toHaveURL(/\/links$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "My Links" })).toBeVisible();

    const csrfResponse = await page.request.get("/api/auth/csrf");
    expect(csrfResponse.ok()).toBe(true);
    const csrfBody = (await csrfResponse.json()) as CsrfResponse;
    expect(csrfBody.csrfToken).toBeTruthy();

    const signOutResponse = await page.request.post("/api/auth/signout", {
      form: {
        callbackUrl: "/",
        csrfToken: csrfBody.csrfToken ?? "",
      },
    });
    expect(signOutResponse.status()).toBeLessThan(400);

    await page.goto("/links");
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Flinks$/);
  } finally {
    await cleanupAuthState(email);
  }
});
