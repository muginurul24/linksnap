import { createHmac } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { subscriptions, transactions, users } from "../../src/lib/db/schema";
import { hashPassword } from "../../src/lib/auth/password";
import { redis } from "../../src/lib/redis";
import { retryTransientDb } from "./db-retry";

loadEnvConfig(process.cwd());

const testIp = "127.0.0.1";

test.setTimeout(90_000);

async function createVerifiedUser(email: string, password: string): Promise<string> {
  await retryTransientDb(() => db.delete(users).where(eq(users.email, email)));
  const passwordHash = await hashPassword(password);

  const [user] = await retryTransientDb(() =>
    db
      .insert(users)
      .values({
        email,
        emailVerified: new Date(),
        passwordHash,
        plan: "FREE",
      })
      .returning({ id: users.id }),
  );

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
  await retryTransientDb(() => db.delete(users).where(eq(users.email, email)));

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
  const [transaction] = await retryTransientDb(() =>
    db
      .select({
        grossAmountIdr: transactions.grossAmountIdr,
        orderId: transactions.orderId,
        status: transactions.status,
        userId: transactions.userId,
      })
      .from(transactions)
      .where(eq(transactions.orderId, orderId))
      .limit(1),
  );

  return transaction ?? null;
}

async function findBillingState(userId: string) {
  const [user] = await retryTransientDb(() =>
    db.select({ plan: users.plan }).from(users).where(eq(users.id, userId)).limit(1),
  );
  const [subscription] = await retryTransientDb(() =>
    db
      .select({
        plan: subscriptions.plan,
        status: subscriptions.status,
      })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1),
  );

  return {
    subscriptionPlan: subscription?.plan ?? null,
    subscriptionStatus: subscription?.status ?? null,
    userPlan: user?.plan ?? null,
  };
}

async function findBillingStateSafely(userId: string) {
  try {
    return await findBillingState(userId);
  } catch {
    return null;
  }
}

function hasUsablePayGateConfig(): boolean {
  const token = process.env.PAYGATE_STORE_API_TOKEN?.trim();
  const secret = process.env.PAYGATE_WEBHOOK_SECRET?.trim();
  return Boolean(
    token &&
      secret &&
      !token.includes("placeholder") &&
      !secret.includes("placeholder") &&
      !token.startsWith("__") &&
      !secret.startsWith("__"),
  );
}

function signPayGateWebhook(rawBody: string, timestamp: string): string {
  return `sha256=${createHmac("sha256", process.env.PAYGATE_WEBHOOK_SECRET ?? "")
    .update(`${timestamp}.${rawBody}`)
    .digest("hex")}`;
}

test.use({
  extraHTTPHeaders: {
    "x-forwarded-for": testIp,
  },
});

test("should start billing upgrade from the Pro button and redirect to checkout", async ({
  baseURL,
  page,
}) => {
  if (!baseURL) throw new Error("Playwright baseURL is not configured.");

  const email = `e2e-billing-click-${Date.now()}@example.com`;
  const password = "Password1";
  const orderId = `LS-${Date.now()}-abc123def456`;
  let userId: string | undefined;

  try {
    userId = await createVerifiedUser(email, password);
    await signIn(page, { email, password });

    await page.route("**/api/v1/payments/create", async (route) => {
      const request = route.request();
      const payload = request.postDataJSON() as {
        duration?: string;
        paymentMethod?: string;
        plan?: string;
      };

      expect(request.headers()["x-requested-with"]).toBe("XMLHttpRequest");
      expect(payload).toMatchObject({
        duration: "MONTHLY",
        paymentMethod: "bca",
        plan: "PRO",
      });

      await route.fulfill({
        body: JSON.stringify({
          data: {
            orderId,
            redirectUrl: `${baseURL}/checkout/success?order_id=${orderId}`,
            status: "pending",
            transactionId: "paygate-transaction-1",
            vaNumbers: [{ bank: "bca", va_number: "88001234567890" }],
          },
          success: true,
        }),
        contentType: "application/json",
        status: 200,
      });
    });
    await page.route(`**/api/v1/payments/${orderId}`, async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          data: {
            amount: 128000,
            currency: "IDR",
            localStatus: "PENDING",
            midtrans: {
              va_numbers: [{ bank: "bca", va_number: "88001234567890" }],
            },
            order_id: orderId,
            payment_method: "bca",
            payment_type: "bank_transfer",
            status: "pending",
            transaction_id: "paygate-transaction-1",
          },
          success: true,
        }),
        contentType: "application/json",
        status: 200,
      });
    });

    await page.goto("/settings/billing");
    await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
    await page.getByRole("button", { name: "Upgrade to Pro" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("LinkSnap Pro")).toBeVisible();
    await page.getByRole("button", { name: "Choose payment method" }).click();
    await expect(
      page.getByRole("region", { name: "Payment method" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Select BCA Virtual Account" }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Review upgrade" }).click();
    await expect(page.getByText("Summary")).toBeVisible();
    await page.getByRole("button", { name: "Start checkout" }).click();

    await expect(page).toHaveURL(
      new RegExp(`/checkout/success\\?order_id=${orderId}$`),
      { timeout: 15_000 },
    );
    await expect(page.getByText("Checkout complete", { exact: true })).toBeVisible();
    await expect(page.getByText("88001234567890")).toBeVisible();
    await expect(
      page.getByText("Payment status refreshes every 10 seconds after payment."),
    ).toBeVisible();
  } finally {
    await cleanupPaymentFlowState(email, userId);
  }
});

test("should create sandbox payment and activate billing through webhook", async ({
  baseURL,
  page,
}) => {
  test.skip(
    !hasUsablePayGateConfig(),
    "Non-placeholder PayGate token and webhook secret values are required for payment E2E.",
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
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      },
    );
    if (!createPaymentResponse.ok()) {
      const failure = (await createPaymentResponse.json().catch(() => null)) as {
        error?: {
          code?: string;
        };
      } | null;

      test.skip(
        failure?.error?.code === "PAYMENT_CONFIGURATION_ERROR" ||
          failure?.error?.code === "PAYMENT_PROVIDER_ERROR",
        "PayGate sandbox is unavailable or local credentials are not usable.",
      );
    }
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

    const timestamp = "2026-05-07T08:00:00+07:00";
    const webhookPayload = {
      amount: transaction.grossAmountIdr,
      currency: "IDR",
      event: "transaction.updated",
      order_id: orderId,
      paid_at: timestamp,
      payment_type: "bank_transfer",
      status: "paid",
      store_id: "st_e2e",
      transaction_id: "paygate-transaction-e2e",
      webhook_id: "wd_e2e",
    };
    const rawWebhookPayload = JSON.stringify(webhookPayload);
    const webhookResponse = await page.request.post(
      `${baseURL}/api/v1/payments/webhook`,
      {
        data: webhookPayload,
        headers: {
          "content-type": "application/json",
          "x-webhook-signature": signPayGateWebhook(rawWebhookPayload, timestamp),
          "x-webhook-timestamp": timestamp,
        },
      },
    );
    expect(webhookResponse.ok()).toBe(true);

    await expect
      .poll(() => findBillingStateSafely(userId ?? ""), {
        message: "webhook should activate paid billing",
        timeout: 10_000,
      })
      .toEqual({
        subscriptionPlan: "PRO",
        subscriptionStatus: "ACTIVE",
        userPlan: "PRO",
      });

    await page.goto(`/checkout/success?order_id=${orderId}`);
    await expect(page.getByText("Checkout complete")).toBeVisible();
    await expect(page.getByText("Payment confirmed")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Go to Dashboard" }),
    ).toBeVisible();

    await page.goto("/settings/billing");
    await expect(
      page.getByText("Pro Plan", { exact: true }).last(),
    ).toBeVisible();
    await expect(page.getByText("Active", { exact: true }).first()).toBeVisible();
  } finally {
    await cleanupPaymentFlowState(email, userId);
  }
});
