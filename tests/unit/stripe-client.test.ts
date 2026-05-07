import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalStripeSecretKey = process.env.STRIPE_SECRET_KEY;
const originalStripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const originalStripeIsTestMode = process.env.STRIPE_IS_TEST_MODE;

function restoreEnv(key: keyof NodeJS.ProcessEnv, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

async function importStripeModule(): Promise<
  typeof import("../../src/lib/payments/stripe")
> {
  vi.resetModules();
  return import("../../src/lib/payments/stripe");
}

describe("Stripe client configuration", () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_unit";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_unit";
    process.env.STRIPE_IS_TEST_MODE = "true";
  });

  afterEach(() => {
    restoreEnv("STRIPE_SECRET_KEY", originalStripeSecretKey);
    restoreEnv("STRIPE_WEBHOOK_SECRET", originalStripeWebhookSecret);
    restoreEnv("STRIPE_IS_TEST_MODE", originalStripeIsTestMode);
  });

  it("should initialize a Stripe client when configuration is present", async () => {
    const { assertStripeConfigured, createStripeClient, stripe } =
      await importStripeModule();

    expect(() => assertStripeConfigured()).not.toThrow();
    expect(createStripeClient()).toHaveProperty("checkout.sessions.create");
    expect(stripe).toHaveProperty("webhooks.constructEvent");
  });

  it("should reject missing Stripe secret key configuration", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_unit";
    const stripeModule = await importStripeModule();

    expect(() =>
      stripeModule.assertStripeConfigured({
        secretKey: "",
        webhookSecret: "whsec_unit",
      }),
    ).toThrow(stripeModule.StripeConfigurationError);
  });

  it("should reject missing Stripe webhook secret configuration", async () => {
    const stripeModule = await importStripeModule();

    expect(() =>
      stripeModule.assertStripeConfigured({
        secretKey: "sk_test_unit",
        webhookSecret: "",
      }),
    ).toThrow(stripeModule.StripeConfigurationError);
  });

  it("should default to Stripe test mode unless explicitly disabled", async () => {
    delete process.env.STRIPE_IS_TEST_MODE;
    const stripeModule = await importStripeModule();

    expect(stripeModule.isStripeTestMode()).toBe(true);
    expect(stripeModule.isStripeTestMode({ isTestMode: false })).toBe(false);
  });
});
