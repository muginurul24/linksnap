import type Stripe from "stripe";
import { stripe } from "@/lib/payments/stripe";
import { normalizePaymentBaseUrl } from "@/lib/payments/redirects";
import { formatPaymentItemName } from "@/lib/payments/pricing";
import type { PaidPlan, PaymentDuration } from "@/lib/validations/payment";

type StripeCheckoutCustomer = {
  email: string | null;
  name: string | null;
};

export type CreateStripeCheckoutSessionInput = {
  amountUsd: number;
  baseUrl: string;
  customer: StripeCheckoutCustomer;
  duration: PaymentDuration;
  orderId: string;
  plan: PaidPlan;
  userId: string;
};

export class StripeCheckoutError extends Error {
  constructor(message: string) {
    super(message);
  }
}

function getRecurringInterval(duration: PaymentDuration): "month" | "year" {
  return duration === "YEARLY" ? "year" : "month";
}

function toStripeUnitAmount(amountUsd: number): number {
  const unitAmount = Math.round(amountUsd * 100);

  if (!Number.isSafeInteger(unitAmount) || unitAmount <= 0) {
    throw new StripeCheckoutError("Stripe checkout amount is invalid.");
  }

  return unitAmount;
}

export function buildStripeCheckoutSessionParams({
  amountUsd,
  baseUrl,
  customer,
  duration,
  orderId,
  plan,
  userId,
}: CreateStripeCheckoutSessionInput): Stripe.Checkout.SessionCreateParams {
  const normalizedBaseUrl = normalizePaymentBaseUrl(baseUrl);
  const metadata = {
    duration,
    orderId,
    plan,
    userId,
  };

  return {
    cancel_url: `${normalizedBaseUrl}/checkout/cancel?order_id=${encodeURIComponent(orderId)}`,
    client_reference_id: userId,
    customer_email: customer.email ?? undefined,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: formatPaymentItemName(plan, duration),
          },
          recurring: {
            interval: getRecurringInterval(duration),
          },
          unit_amount: toStripeUnitAmount(amountUsd),
        },
        quantity: 1,
      },
    ],
    metadata,
    mode: "subscription",
    payment_method_types: ["card"],
    success_url: `${normalizedBaseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${encodeURIComponent(orderId)}`,
    subscription_data: {
      metadata,
    },
  };
}

export async function createStripeCheckoutSession(
  input: CreateStripeCheckoutSessionInput,
  client: Stripe = stripe,
): Promise<Stripe.Checkout.Session> {
  const session = await client.checkout.sessions.create(
    buildStripeCheckoutSessionParams(input),
  );

  if (!session.url) {
    throw new StripeCheckoutError("Stripe checkout session did not include a URL.");
  }

  return session;
}
