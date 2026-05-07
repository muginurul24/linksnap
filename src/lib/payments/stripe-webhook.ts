import Stripe from "stripe";
import {
  expireSubscriptionForUser,
  findBillingUserById,
  findPaymentTransactionByOrderId,
  updatePaymentTransactionStatus,
  updateUserPlanForPayment,
  updateUserPlanForSubscription,
  upsertActiveSubscriptionForUser,
} from "@/lib/db/queries/payments";
import {
  InvalidSubscriptionPaymentError,
  createOrRenewSubscriptionForPayment,
} from "@/lib/payments/subscription";
import { stripe } from "@/lib/payments/stripe";
import {
  paidPlanSchema,
  paymentDurationSchema,
  type PaidPlan,
  type PaymentDuration,
} from "@/lib/validations/payment";

type StripeWebhookBody = Buffer | string;

type StripeSubscriptionWithPeriods = Stripe.Subscription & {
  current_period_end?: unknown;
  current_period_start?: unknown;
};

type StripeWebhookMetadata = {
  duration: PaymentDuration;
  orderId: string | null;
  plan: PaidPlan;
  userId: string;
};

export type StripeWebhookResult = {
  activatedSubscription: boolean;
  eventType: string;
  ignored: boolean;
  orderId: string | null;
  userId: string | null;
};

export class StripeSignatureVerificationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class StripeWebhookMetadataError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class UnknownStripePaymentOrderError extends Error {
  constructor(orderId: string) {
    super(`Stripe payment order ${orderId} was not found.`);
  }
}

export class InvalidStripePaymentPlanError extends Error {
  constructor(orderId: string | null) {
    super(`Stripe payment ${orderId ?? "event"} has invalid plan data.`);
  }
}

function getMetadataValue(
  metadata: Stripe.Metadata | null | undefined,
  key: string,
): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseStripeMetadata(
  metadata: Stripe.Metadata | null | undefined,
  {
    requireOrderId,
  }: {
    requireOrderId: boolean;
  },
): StripeWebhookMetadata {
  const orderId = getMetadataValue(metadata, "orderId");
  const userId = getMetadataValue(metadata, "userId");
  const parsedPlan = paidPlanSchema.safeParse(getMetadataValue(metadata, "plan"));
  const parsedDuration = paymentDurationSchema.safeParse(
    getMetadataValue(metadata, "duration"),
  );

  if (!userId || (requireOrderId && !orderId)) {
    throw new StripeWebhookMetadataError("Stripe webhook metadata is incomplete.");
  }

  if (!parsedPlan.success || !parsedDuration.success) {
    throw new InvalidStripePaymentPlanError(orderId);
  }

  return {
    duration: parsedDuration.data,
    orderId,
    plan: parsedPlan.data,
    userId,
  };
}

function getUnixTimestampDate(value: unknown): Date | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return new Date(value * 1000);
}

function getStripePaymentMethod(session: Stripe.Checkout.Session): string {
  const paymentMethod = session.payment_method_types?.[0];
  return paymentMethod ?? "card";
}

export function verifyStripeWebhookSignature(
  body: StripeWebhookBody,
  signature: string | null,
  secret: string,
  client: Stripe = stripe,
): Stripe.Event {
  if (!signature) {
    throw new StripeSignatureVerificationError("Stripe signature is missing.");
  }

  try {
    return client.webhooks.constructEvent(body, signature, secret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe signature.";
    throw new StripeSignatureVerificationError(message);
  }
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<StripeWebhookResult> {
  const metadata = parseStripeMetadata(session.metadata, { requireOrderId: true });
  const orderId = metadata.orderId;

  if (!orderId) {
    throw new StripeWebhookMetadataError("Stripe checkout order ID is missing.");
  }

  const transaction = await findPaymentTransactionByOrderId(orderId);
  if (!transaction) throw new UnknownStripePaymentOrderError(orderId);

  if (transaction.gateway !== "stripe") {
    throw new StripeWebhookMetadataError("Stripe webhook matched non-Stripe order.");
  }

  if (transaction.status === "SETTLEMENT") {
    return {
      activatedSubscription: false,
      eventType: "checkout.session.completed",
      ignored: true,
      orderId,
      userId: transaction.userId,
    };
  }

  const updatedTransaction = await updatePaymentTransactionStatus({
    expectedStatus: transaction.status,
    orderId,
    paidAt: getUnixTimestampDate(session.created) ?? new Date(),
    paymentMethod: getStripePaymentMethod(session),
    status: "SETTLEMENT",
  });

  if (!updatedTransaction) {
    return {
      activatedSubscription: false,
      eventType: "checkout.session.completed",
      ignored: true,
      orderId,
      userId: transaction.userId,
    };
  }

  try {
    await createOrRenewSubscriptionForPayment(updatedTransaction);
  } catch (error) {
    if (error instanceof InvalidSubscriptionPaymentError) {
      throw new InvalidStripePaymentPlanError(orderId);
    }

    throw error;
  }

  return {
    activatedSubscription: true,
    eventType: "checkout.session.completed",
    ignored: false,
    orderId,
    userId: updatedTransaction.userId,
  };
}

async function syncActiveStripeSubscription(
  subscription: StripeSubscriptionWithPeriods,
): Promise<StripeWebhookResult> {
  const metadata = parseStripeMetadata(subscription.metadata, {
    requireOrderId: false,
  });
  const user = await findBillingUserById(metadata.userId);

  if (!user) {
    return {
      activatedSubscription: false,
      eventType: "customer.subscription.updated",
      ignored: true,
      orderId: metadata.orderId,
      userId: metadata.userId,
    };
  }

  await upsertActiveSubscriptionForUser({
    currentPeriodEnd:
      getUnixTimestampDate(subscription.current_period_end) ??
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    currentPeriodStart:
      getUnixTimestampDate(subscription.current_period_start) ?? new Date(),
    plan: metadata.plan,
    userId: metadata.userId,
  });
  await updateUserPlanForPayment({
    plan: metadata.plan,
    userId: metadata.userId,
  });

  return {
    activatedSubscription: true,
    eventType: "customer.subscription.updated",
    ignored: false,
    orderId: metadata.orderId,
    userId: metadata.userId,
  };
}

async function expireStripeSubscription(
  subscription: Stripe.Subscription,
  eventType: string,
): Promise<StripeWebhookResult> {
  const metadata = parseStripeMetadata(subscription.metadata, {
    requireOrderId: false,
  });
  const expiredAt = subscription.canceled_at
    ? new Date(subscription.canceled_at * 1000)
    : new Date();

  await expireSubscriptionForUser({
    expiredAt,
    userId: metadata.userId,
  });
  await updateUserPlanForSubscription({
    plan: "FREE",
    userId: metadata.userId,
  });

  return {
    activatedSubscription: false,
    eventType,
    ignored: false,
    orderId: metadata.orderId,
    userId: metadata.userId,
  };
}

async function handleSubscriptionUpdated(
  subscription: StripeSubscriptionWithPeriods,
): Promise<StripeWebhookResult> {
  if (subscription.status === "active" || subscription.status === "trialing") {
    return syncActiveStripeSubscription(subscription);
  }

  if (
    subscription.status === "canceled" ||
    subscription.status === "incomplete_expired" ||
    subscription.status === "paused" ||
    subscription.status === "unpaid"
  ) {
    return expireStripeSubscription(subscription, "customer.subscription.updated");
  }

  const metadata = parseStripeMetadata(subscription.metadata, {
    requireOrderId: false,
  });

  return {
    activatedSubscription: false,
    eventType: "customer.subscription.updated",
    ignored: true,
    orderId: metadata.orderId,
    userId: metadata.userId,
  };
}

function handleInvoicePaymentFailed(invoice: Stripe.Invoice): StripeWebhookResult {
  console.warn("[payments:stripe] invoice payment failed", {
    customer: typeof invoice.customer === "string" ? invoice.customer : null,
    invoiceId: invoice.id,
    subscription:
      "subscription" in invoice && typeof invoice.subscription === "string"
        ? invoice.subscription
        : null,
  });

  return {
    activatedSubscription: false,
    eventType: "invoice.payment_failed",
    ignored: false,
    orderId: null,
    userId: null,
  };
}

export async function handleStripeWebhook(
  event: Stripe.Event,
): Promise<StripeWebhookResult> {
  if (event.type === "checkout.session.completed") {
    return handleCheckoutSessionCompleted(
      event.data.object as Stripe.Checkout.Session,
    );
  }

  if (event.type === "customer.subscription.updated") {
    return handleSubscriptionUpdated(
      event.data.object as StripeSubscriptionWithPeriods,
    );
  }

  if (event.type === "customer.subscription.deleted") {
    return expireStripeSubscription(
      event.data.object as Stripe.Subscription,
      "customer.subscription.deleted",
    );
  }

  if (event.type === "invoice.payment_failed") {
    return handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
  }

  return {
    activatedSubscription: false,
    eventType: event.type,
    ignored: true,
    orderId: null,
    userId: null,
  };
}
