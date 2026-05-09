import { createHmac } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { transactions, users } from "../../src/lib/db/schema";
import { hashPassword } from "../../src/lib/auth/password";
import { redis } from "../../src/lib/redis";
import { retryTransientDb } from "./db-retry";

loadEnvConfig(process.cwd());

test.setTimeout(180_000);

const testIp = "198.51.100.31";

type ChannelSmokeCase = {
  amount: number;
  expectedText: string;
  method: "bca" | "gopay" | "indomaret" | "qris";
  name: string;
  orderSuffix: string;
  paymentType: "bank_transfer" | "cstore" | "ewallet" | "qris";
  search: string;
  selectName: string;
};

const channelSmokeCases: ChannelSmokeCase[] = [
  {
    amount: 128000,
    expectedText: "88001234567890",
    method: "bca",
    name: "BCA Virtual Account",
    orderSuffix: "bca111111111",
    paymentType: "bank_transfer",
    search: "bca",
    selectName: "Select BCA Virtual Account",
  },
  {
    amount: 128000,
    expectedText: "Open GoPay",
    method: "gopay",
    name: "GoPay",
    orderSuffix: "9012aabbccdd",
    paymentType: "ewallet",
    search: "gopay",
    selectName: "Select GoPay",
  },
  {
    amount: 128000,
    expectedText: "000201010212",
    method: "qris",
    name: "QRIS",
    orderSuffix: "c0ffee000001",
    paymentType: "qris",
    search: "qris",
    selectName: "Select QRIS",
  },
  {
    amount: 128000,
    expectedText: "1234567890",
    method: "indomaret",
    name: "Indomaret",
    orderSuffix: "1d0a1d0a1d0a",
    paymentType: "cstore",
    search: "indomaret",
    selectName: "Select Indomaret",
  },
];

async function createVerifiedUser({
  email,
  password,
  plan = "FREE",
}: {
  email: string;
  password: string;
  plan?: "BUSINESS" | "FREE" | "PRO";
}): Promise<string> {
  await retryTransientDb(() => db.delete(users).where(eq(users.email, email)));
  const passwordHash = await hashPassword(password);

  const [user] = await retryTransientDb(() =>
    db
      .insert(users)
      .values({
        email,
        emailVerified: new Date(),
        passwordHash,
        plan,
      })
      .returning({ id: users.id }),
  );

  if (!user) throw new Error("Unable to create E2E user.");

  return user.id;
}

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/auth/callback/credentials") &&
      response.request().method() === "POST",
    { timeout: 45_000 },
  );

  await page.getByRole("button", { name: /^Sign in$/ }).click();
  expect((await responsePromise).ok()).toBe(true);
}

async function cleanupPaymentSmokeState(
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
          `rate-limit:api:payments:detail:${userId}`,
          `rate-limit:api:payments:history:${userId}`,
          `rate-limit:api:payments:subscriptions:cancel:${userId}`,
          `rate-limit:api:payments:subscriptions:reactivate:${userId}`,
        ]
      : []),
  );
}

function createPaymentResponse(caseData: ChannelSmokeCase, orderId: string) {
  const channel = {
    category:
      caseData.paymentType === "bank_transfer"
        ? "bank_transfer"
        : caseData.paymentType === "cstore"
          ? "convenience_store"
          : caseData.paymentType,
    categoryLabel:
      caseData.paymentType === "bank_transfer"
        ? "Bank Transfer"
        : caseData.paymentType === "cstore"
          ? "Convenience Store"
          : caseData.paymentType === "ewallet"
            ? "E-Wallet"
            : "QRIS",
    estimatedProcessingTime:
      caseData.paymentType === "bank_transfer"
        ? "1-2 hours"
        : caseData.paymentType === "cstore"
          ? "Up to 1 hour"
          : "Instant",
    id: caseData.method,
    instructions: "Complete the payment before it expires.",
    name: caseData.name,
    shortName:
      caseData.method === "bca"
        ? "BCA"
        : caseData.method === "indomaret"
          ? "Indomaret"
          : caseData.name,
  };

  return {
    data: {
      actions:
        caseData.method === "gopay"
          ? [
              {
                name: "Open wallet",
                type: "deeplink",
                url: "https://wallet.example/gopay",
              },
            ]
          : [],
      channel,
      expiresAt: "2026-05-09T05:00:00.000Z",
      orderId,
      paymentCode: caseData.method === "indomaret" ? "1234567890" : null,
      paymentMethod: caseData.method,
      paymentType: caseData.paymentType,
      qrString: caseData.method === "qris" ? "000201010212" : null,
      qrUrl: caseData.method === "qris" ? "https://pay.example/qris.png" : null,
      redirectUrl: `/checkout/success?order_id=${orderId}`,
      status: "pending",
      transactionId: "paygate-transaction-1",
      vaNumbers:
        caseData.method === "bca"
          ? [{ bank: "bca", va_number: "88001234567890" }]
          : [],
    },
    success: true,
  };
}

function createPaymentDetailResponse(caseData: ChannelSmokeCase, orderId: string) {
  return {
    data: {
      amount: caseData.amount,
      actions:
        caseData.method === "gopay"
          ? [{ name: "Open wallet", type: "deeplink", url: "https://wallet.example/gopay" }]
          : [],
      currency: "IDR",
      localStatus: "PENDING",
      midtrans: {
        ...(caseData.method === "bca"
          ? { va_numbers: [{ bank: "bca", va_number: "88001234567890" }] }
          : {}),
        ...(caseData.method === "indomaret"
          ? { cstore: "indomaret", payment_code: "1234567890" }
          : {}),
        ...(caseData.method === "qris"
          ? {
              qr_string: "000201010212",
              qr_url: "https://pay.example/qris.png",
            }
          : {}),
      },
      order_id: orderId,
      payment_code: caseData.method === "indomaret" ? "1234567890" : null,
      payment_method: caseData.method,
      payment_type: caseData.paymentType,
      qr_string: caseData.method === "qris" ? "000201010212" : null,
      qr_url: caseData.method === "qris" ? "https://pay.example/qris.png" : null,
      status: "pending",
      transaction_id: "paygate-transaction-1",
    },
    success: true,
  };
}

async function mockCheckoutRoutes({
  baseURL,
  caseData,
  orderId,
  page,
}: {
  baseURL: string;
  caseData: ChannelSmokeCase;
  orderId: string;
  page: Page;
}): Promise<{ getPaymentDetailRequestCount: () => number }> {
  let paymentDetailRequestCount = 0;

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
      paymentMethod: caseData.method,
      plan: "PRO",
    });

    const response = createPaymentResponse(caseData, orderId);
    response.data.redirectUrl = `${baseURL}${response.data.redirectUrl}`;

    await route.fulfill({
      body: JSON.stringify(response),
      contentType: "application/json",
      status: 201,
    });
  });

  await page.route(`**/api/v1/payments/${orderId}`, async (route) => {
    paymentDetailRequestCount += 1;

    await route.fulfill({
      body: JSON.stringify(createPaymentDetailResponse(caseData, orderId)),
      contentType: "application/json",
      status: 200,
    });
  });

  return {
    getPaymentDetailRequestCount: () => paymentDetailRequestCount,
  };
}

async function startCheckoutFromBilling(page: Page, caseData: ChannelSmokeCase) {
  await page.goto("/settings/billing");
  await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
  await page.getByRole("button", { name: "Upgrade to Pro" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Choose payment method" }).click();
  await expect(page.getByRole("region", { name: "Payment method" })).toBeVisible();
  await page.getByLabel("Search payment methods").fill(caseData.search);
  await page.getByRole("button", { name: caseData.selectName }).click();
  await page.getByRole("button", { name: "Review upgrade" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Summary")).toBeVisible();
  await expect(dialog.getByText(caseData.name).last()).toBeVisible();
  await page.getByRole("button", { name: "Start checkout" }).click();
}

async function expectCheckoutSuccessUrl(
  page: Page,
  orderId: string,
  timeout = 60_000,
): Promise<void> {
  const successUrl = new RegExp(`/checkout/success\\?order_id=${orderId}$`);

  await page.waitForURL(successUrl, {
    timeout,
    waitUntil: "domcontentloaded",
  });
  expect(page.url()).toMatch(successUrl);
}

async function createPendingPaymentTransaction({
  orderId,
  userId,
}: {
  orderId: string;
  userId: string;
}) {
  await retryTransientDb(() =>
    db.insert(transactions).values({
      duration: "MONTHLY",
      grossAmountIdr: 128000,
      grossAmountUsd: 8,
      orderId,
      paymentMethod: "bca",
      plan: "PRO",
      status: "PENDING",
      userId,
    }),
  );
}

function signWebhookPayload(rawBody: string, timestamp: string): string {
  return `sha256=${createHmac("sha256", process.env.PAYGATE_WEBHOOK_SECRET ?? "")
    .update(`${timestamp}.${rawBody}`)
    .digest("hex")}`;
}

test.use({
  extraHTTPHeaders: {
    "x-forwarded-for": testIp,
  },
});

for (const caseData of channelSmokeCases) {
  test(`should complete ${caseData.name} checkout smoke`, async ({
    baseURL,
    page,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is not configured.");

    const email = `e2e-payment-${caseData.method}-${Date.now()}@example.com`;
    const password = "Password1";
    const orderId = `LS-${Date.now()}-${caseData.orderSuffix}`;
    let userId: string | undefined;

    try {
      userId = await createVerifiedUser({ email, password });
      await signIn(page, email, password);
      const checkoutRoutes = await mockCheckoutRoutes({
        baseURL,
        caseData,
        orderId,
        page,
      });

      const createPaymentResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/v1/payments/create") &&
          response.request().method() === "POST",
        { timeout: 60_000 },
      );

      await startCheckoutFromBilling(page, caseData);
      expect((await createPaymentResponsePromise).ok()).toBe(true);

      await expectCheckoutSuccessUrl(page, orderId);
      await expect(page.getByText("Checkout complete", { exact: true })).toBeVisible({
        timeout: 60_000,
      });
      await expect(page.getByText(caseData.expectedText).first()).toBeVisible({
        timeout: 60_000,
      });
      expect(checkoutRoutes.getPaymentDetailRequestCount()).toBeGreaterThan(0);
    } finally {
      await cleanupPaymentSmokeState(email, userId);
    }
  });
}

test("should keep selector grouping search mobile layout back navigation and double-submit guard", async ({
  baseURL,
  page,
}) => {
  if (!baseURL) throw new Error("Playwright baseURL is not configured.");

  const email = `e2e-payment-dialog-${Date.now()}@example.com`;
  const password = "Password1";
  const orderId = `LS-${Date.now()}-d1a10d111111`;
  let createCalls = 0;
  let userId: string | undefined;

  try {
    userId = await createVerifiedUser({ email, password });
    await signIn(page, email, password);
    await page.setViewportSize({ width: 390, height: 844 });

    const bcaCase = channelSmokeCases[0];
    await mockCheckoutRoutes({ baseURL, caseData: bcaCase, orderId, page });
    await page.unroute("**/api/v1/payments/create");
    await page.route("**/api/v1/payments/create", async (route) => {
      createCalls += 1;
      await route.fulfill({
        body: JSON.stringify({
          ...createPaymentResponse(bcaCase, orderId),
          data: {
            ...createPaymentResponse(bcaCase, orderId).data,
            redirectUrl: `${baseURL}/checkout/success?order_id=${orderId}`,
          },
        }),
        contentType: "application/json",
        status: 201,
      });
    });

    await page.goto("/settings/billing");
    await page.getByRole("button", { name: "Upgrade to Pro" }).click();
    await page.getByRole("button", { name: "Choose payment method" }).click();
    await expect(page.getByRole("heading", { name: "Bank Transfer" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "E-Wallet" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "QRIS" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Convenience Store" }),
    ).toBeVisible();
    await page.getByLabel("Search payment methods").fill("qris");
    await expect(page.getByRole("button", { name: "Select QRIS" })).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByText("LinkSnap Pro")).toBeVisible();
    await page.getByRole("button", { name: "Choose payment method" }).click();
    await page.getByRole("button", { name: "Review upgrade" }).click();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("region", { name: "Payment method" })).toBeVisible();
    await page.getByRole("button", { name: "Review upgrade" }).click();

    const startButton = page.getByRole("button", { name: "Start checkout" });
    await Promise.all([startButton.click(), startButton.click()]);
    await expectCheckoutSuccessUrl(page, orderId, 30_000);
    expect(createCalls).toBe(1);
  } finally {
    await cleanupPaymentSmokeState(email, userId);
  }
});

test("should activate subscription from webhook and show billing plan", async ({
  page,
}) => {
  test.skip(
    !process.env.PAYGATE_WEBHOOK_SECRET?.trim(),
    "PAYGATE_WEBHOOK_SECRET is required for webhook smoke.",
  );

  const email = `e2e-payment-webhook-${Date.now()}@example.com`;
  const password = "Password1";
  const orderId = `LS-${Date.now()}-feedface0001`;
  let userId: string | undefined;

  try {
    userId = await createVerifiedUser({ email, password });
    await createPendingPaymentTransaction({ orderId, userId });
    await signIn(page, email, password);

    const timestamp = "2026-05-09T08:00:00+07:00";
    const payload = {
      amount: 128000,
      currency: "IDR",
      event: "transaction.updated",
      metadata: { paymentMethod: "bca" },
      midtrans: {
        fraud_status: "accept",
        transaction_id: "midtrans-trx-1",
        transaction_status: "settlement",
        va_numbers: [{ bank: "bca", va_number: "88001234567890" }],
      },
      order_id: orderId,
      paid_at: timestamp,
      payment_method: "bca",
      payment_type: "bank_transfer",
      status: "paid",
      store_id: "store-1",
      transaction_id: "paygate-transaction-1",
      webhook_id: `webhook-${Date.now()}`,
    };
    const rawBody = JSON.stringify(payload);
    const response = await page.request.post("/api/v1/payments/webhook", {
      data: payload,
      headers: {
        "x-webhook-signature": signWebhookPayload(rawBody, timestamp),
        "x-webhook-timestamp": timestamp,
      },
    });

    expect(response.ok()).toBe(true);
    await page.goto("/settings/billing");
    await expect(page.getByRole("main").getByText("Pro Plan").first()).toBeVisible();
    await expect(page.getByText("BCA").first()).toBeVisible();
  } finally {
    await cleanupPaymentSmokeState(email, userId);
  }
});

test("should show current plan state for users already on a paid plan", async ({
  page,
}) => {
  const email = `e2e-payment-current-${Date.now()}@example.com`;
  const password = "Password1";
  let userId: string | undefined;

  try {
    userId = await createVerifiedUser({ email, password, plan: "PRO" });
    await signIn(page, email, password);

    await page.goto("/pricing");
    await expect(page.getByText("Current plan").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Manage current plan" })).toBeVisible();

    await page.goto("/settings/billing");
    await expect(page.getByRole("main").getByText("Pro Plan").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Upgrade to Pro" }),
    ).toHaveCount(0);
  } finally {
    await cleanupPaymentSmokeState(email, userId);
  }
});
