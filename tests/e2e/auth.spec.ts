import { expect, test } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { users } from "../../src/lib/db/schema";
import { redis } from "../../src/lib/redis";

loadEnvConfig(process.cwd());

const authEmailFile = join(process.cwd(), ".e2e/auth-emails.jsonl");
const testIp = "198.51.100.27";

type VerificationEmailRecord = {
  otp: string;
  to: string;
  type: "verification";
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
  await db.delete(users).where(eq(users.email, email));
  await redis.del(
    `rate-limit:auth:login:${testIp}`,
    "rate-limit:auth:login:unknown",
    `rate-limit:auth:register:${testIp}`,
    "rate-limit:auth:register:unknown",
    `rate-limit:auth:resend-otp:${email}`,
  );
}

test.use({
  extraHTTPHeaders: {
    "x-forwarded-for": testIp,
  },
});

test("should register verify login and access the dashboard", async ({ page }) => {
  const email = `e2e-auth-${Date.now()}@example.com`;
  const password = "Password1";
  const encodedEmail = encodeURIComponent(email);

  await resetAuthEmailFile();
  await cleanupAuthState(email);

  try {
    await page.goto("/links");
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Flinks$/);

    await page.getByRole("link", { name: "Create one" }).click();
    await expect(page).toHaveURL(/\/register$/);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(new RegExp(`/verify\\?email=${encodedEmail}`));

    const otp = await waitForOtp(email);
    await page.getByLabel("Verification code").fill(otp);

    await expect(page).toHaveURL(/\/login\?verified=true$/);
    await expect(
      page.getByRole("main").getByText("Email verified. You can sign in now."),
    ).toBeVisible();

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: /^Sign in$/ }).click();

    await expect(page).toHaveURL(/\/links$/);
    await expect(page.getByRole("heading", { name: "My Links" })).toBeVisible();
  } finally {
    await cleanupAuthState(email);
  }
});
