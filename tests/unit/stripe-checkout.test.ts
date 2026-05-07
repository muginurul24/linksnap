import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import {
  StripeCheckoutError,
  buildStripeCheckoutSessionParams,
  createStripeCheckoutSession,
} from "../../src/lib/payments/stripe-checkout";

describe("Stripe checkout session helpers", () => {
  it("should build subscription checkout params with user and order metadata", () => {
    const params = buildStripeCheckoutSessionParams({
      amountUsd: 8,
      baseUrl: "https://www.justqiu.cloud/",
      customer: {
        email: "buyer@example.com",
        name: "Rafi Link",
      },
      duration: "MONTHLY",
      orderId: "LS-ST-123",
      plan: "PRO",
      userId: "user-1",
    });

    expect(params).toMatchObject({
      cancel_url: "https://www.justqiu.cloud/checkout/cancel?order_id=LS-ST-123",
      client_reference_id: "user-1",
      customer_email: "buyer@example.com",
      metadata: {
        duration: "MONTHLY",
        orderId: "LS-ST-123",
        plan: "PRO",
        userId: "user-1",
      },
      mode: "subscription",
      payment_method_types: ["card"],
      success_url:
        "https://www.justqiu.cloud/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=LS-ST-123",
      subscription_data: {
        metadata: {
          duration: "MONTHLY",
          orderId: "LS-ST-123",
          plan: "PRO",
          userId: "user-1",
        },
      },
    });
    expect(params.line_items?.[0]).toMatchObject({
      price_data: {
        currency: "usd",
        product_data: {
          name: "LinkSnap Pro Monthly",
        },
        recurring: {
          interval: "month",
        },
        unit_amount: 800,
      },
      quantity: 1,
    });
  });

  it("should use yearly recurring interval for annual checkout", () => {
    const params = buildStripeCheckoutSessionParams({
      amountUsd: 228,
      baseUrl: "https://www.justqiu.cloud",
      customer: {
        email: null,
        name: null,
      },
      duration: "YEARLY",
      orderId: "LS-ST-456",
      plan: "BUSINESS",
      userId: "user-1",
    });

    expect(params.line_items?.[0]?.price_data).toMatchObject({
      recurring: {
        interval: "year",
      },
      unit_amount: 22800,
    });
    expect(params.customer_email).toBeUndefined();
  });

  it("should create a Stripe checkout session and require a hosted URL", async () => {
    const create = vi.fn(async () => ({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/c/pay/cs_test_123",
    }));
    const client = {
      checkout: {
        sessions: {
          create,
        },
      },
    } as unknown as Stripe;

    const session = await createStripeCheckoutSession(
      {
        amountUsd: 8,
        baseUrl: "https://www.justqiu.cloud",
        customer: {
          email: "buyer@example.com",
          name: "Rafi Link",
        },
        duration: "MONTHLY",
        orderId: "LS-ST-123",
        plan: "PRO",
        userId: "user-1",
      },
      client,
    );

    expect(session.url).toBe("https://checkout.stripe.com/c/pay/cs_test_123");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        client_reference_id: "user-1",
        mode: "subscription",
      }),
    );
  });

  it("should reject invalid checkout amounts and missing session URLs", async () => {
    expect(() =>
      buildStripeCheckoutSessionParams({
        amountUsd: 0,
        baseUrl: "https://www.justqiu.cloud",
        customer: {
          email: null,
          name: null,
        },
        duration: "MONTHLY",
        orderId: "LS-ST-123",
        plan: "PRO",
        userId: "user-1",
      }),
    ).toThrow(StripeCheckoutError);

    const client = {
      checkout: {
        sessions: {
          create: vi.fn(async () => ({ id: "cs_test_123", url: null })),
        },
      },
    } as unknown as Stripe;

    await expect(
      createStripeCheckoutSession(
        {
          amountUsd: 8,
          baseUrl: "https://www.justqiu.cloud",
          customer: {
            email: null,
            name: null,
          },
          duration: "MONTHLY",
          orderId: "LS-ST-123",
          plan: "PRO",
          userId: "user-1",
        },
        client,
      ),
    ).rejects.toThrow(StripeCheckoutError);
  });
});
