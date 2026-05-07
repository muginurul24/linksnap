import { expect, test, type Page } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { subscriptions, transactions, users } from "../../src/lib/db/schema";
import { hashPassword } from "../../src/lib/auth/password";
import { redis } from "../../src/lib/redis";
import { calculateMidtransSignature } from "../../src/lib/payments/webhook";

loadEnvConfig(process.cwd());

const testIp = "198.51.100.29";

async function createVerifiedUser(email: string, password: string): Promise<string> {
  await db.delete(users).where(eq(users.email, email));

  const [user] = await db
    .insert(users)
    .values({
      email,
      emailVerified: new Date(),
      passwordHash: await hashPassword(password),
      plan: "FREE",
    })
    .returning({ id: users.id });

  if (!user) throw new Error("Unable to create E2E user.");

  return user.id;
}

async function signIn(
  page: Page,
  {
    email,
    password,
  }: {
    email: string;
    password: string;
  },
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);

  const credentialsResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/auth/callback/credentials") &&
      response.request().method() === "POST",
    { timeout: 20_000 },
  );

  await page.getByRole("button", { name: /^Sign in$/ }).click();
  const credentialsResponse = await credentialsResponsePromise;
  expect(credentialsResponse.ok()).toBe(true);
}

async function cleanupPaymentFlowState(
  email: string,
  userId?: string,
): Promise<void> {
  await db.delete(users).where(eq(users.email, email));

  await redis.del(
    `rate-limit:auth:login:${testIp}`,
    "rate-limit:auth:login:unknown",
    ...(userId
      ? [
          `rate-limit:api:payments:create:${userId}`,
          `rate-limit:api:payments:history:${userId}`,
        ]
      : []),
  );
}

async function findTransactionByOrderId(orderId: string) {
  const [transaction] = await db
    .select({
      grossAmountIdr: transactions.grossAmountIdr,
      orderId: transactions.orderId,
      status: transactions.status,
      userId: transactions.userId,
    })
    .from(transactions)
    .where(eq(transactions.orderId, orderId))
    .limit(1);

  return transaction ?? null;
}

async function findBillingState(userId: string) {
  const [user] = await db
    .select({ plan: users.plan })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const [subscription] = await db
    .select({
      plan: subscriptions.plan,
      status: subscriptions.status,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  return {
    subscriptionPlan: subscription?.plan ?? null,
    subscriptionStatus: subscription?.status ?? null,
    userPlan: user?.plan ?? null,
  };
}

test.use({
  extraHTTPHeaders: {
    "x-forwarded-for": testIp,
  },
});

test("should create sandbox payment and activate billing through webhook", async ({
  baseURL,
  page,
}) => {
  test.skip(
    !process.env.MIDTRANS_SERVER_KEY,
    "MIDTRANS_SERVER_KEY is required for sandbox payment E2E.",
  );

  if (!baseURL) throw new Error("Playwright baseURL is not configured.");

  const email = `e2e-payment-${Date.now()}@example.com`;
  const password = "Password1";
  let userId: string | undefined;

  try {
    userId = await createVerifiedUser(email, password);
    await signIn(page, { email, password });

    await page.goto("/settings/billing");
    await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
    await expect(
      page.getByText("You are currently on the Free plan."),
    ).toBeVisible();

    await expect(page.getByRole("button", { name: "Upgrade to Pro" })).toBeVisible();
    const createPaymentResponse = await page.request.post(
      `${baseURL}/api/v1/payments/create`,
      {
        data: {
          duration: "MONTHLY",
          plan: "PRO",
        },
      },
    );
    expect(createPaymentResponse.ok()).toBe(true);

    const createPaymentBody = (await createPaymentResponse.json()) as {
      data?: {
        orderId?: string;
        redirectUrl?: string;
      };
      success?: boolean;
    };
    expect(createPaymentBody.success).toBe(true);
    const orderId = createPaymentBody.data?.orderId;
    expect(orderId).toMatch(/^LS-/);

    await expect
      .poll(() => findTransactionByOrderId(orderId ?? ""), {
        message: "created payment transaction should be stored",
        timeout: 10_000,
      })
      .not.toBeNull();
    const transaction = await findTransactionByOrderId(orderId ?? "");

    if (!transaction || !orderId) {
      throw new Error("Created payment transaction was not found.");
    }

    const grossAmount = `${transaction.grossAmountIdr}.00`;
    const webhookResponse = await page.request.post(
      `${baseURL}/api/v1/payments/webhook`,
      {
        data: {
          gross_amount: grossAmount,
          order_id: orderId,
          payment_type: "bank_transfer",
          settlement_time: "2026-05-07 08:00:00",
          signature_key: calculateMidtransSignature({
            grossAmount,
            orderId,
            serverKey: process.env.MIDTRANS_SERVER_KEY ?? "",
            statusCode: "200",
          }),
          status_code: "200",
          transaction_status: "settlement",
        },
      },
    );
    expect(webhookResponse.ok()).toBe(true);

    await expect
      .poll(() => findBillingState(userId ?? ""), {
        message: "webhook should activate paid billing",
        timeout: 10_000,
      })
      .toEqual({
        subscriptionPlan: "PRO",
        subscriptionStatus: "ACTIVE",
        userPlan: "PRO",
      });

    await page.goto("/settings/billing");
    await expect(
      page.getByText("Pro Plan", { exact: true }).last(),
    ).toBeVisible();
    await expect(page.getByText("Active")).toBeVisible();
  } finally {
    await cleanupPaymentFlowState(email, userId);
  }
});
