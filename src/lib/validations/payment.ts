import { z } from "@/lib/validations/zod";

export const paidPlanSchema = z.enum(["PRO", "BUSINESS"]);
export const paymentDurationSchema = z.enum(["MONTHLY", "YEARLY"]);
export const paymentChannelCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(/^[a-z0-9_-]+$/);

export const createPaymentSchema = z
  .object({
    bank: paymentChannelCodeSchema.optional(),
    duration: paymentDurationSchema,
    ewallet: paymentChannelCodeSchema.optional(),
    plan: paidPlanSchema,
    paymentMethod: paymentChannelCodeSchema.optional(),
    store: paymentChannelCodeSchema.optional(),
  })
  .strict();

export const paymentHistoryQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    page: z.coerce.number().int().min(1).default(1),
  })
  .strict();

export const checkoutSuccessQuerySchema = z
  .object({
    order_id: z
      .string()
      .min(1, "Order ID is required")
      .max(100, "Order ID is too long")
      .regex(/^LS(?:-ST)?-\d{13}-[a-f0-9]{12}$/, "Order ID is invalid"),
  })
  .strict();

export const checkoutCancelQuerySchema = z
  .object({
    order_id: z
      .string()
      .max(100, "Order ID is too long")
      .regex(/^LS(?:-ST)?-\d{13}-[a-f0-9]{12}$/, "Order ID is invalid")
      .optional(),
    status: z.enum(["error", "unfinish"]).optional(),
  })
  .strict();

export const payGateWebhookSchema = z.object({
  amount: z.number().int().positive(),
  bank: z.string().optional(),
  currency: z.string().optional(),
  customer: z
    .object({
      email: z.string().optional(),
      name: z.string().optional(),
    })
    .optional(),
  event: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  midtrans: z
    .object({
      cstore: z.string().optional(),
      fraud_status: z.string().optional(),
      transaction_id: z.string().optional(),
      transaction_status: z.string().optional(),
      va_numbers: z
        .array(
          z.object({
            bank: z.string().optional(),
            va_number: z.string().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
  order_id: z.string().min(1, "Order ID is required").max(100),
  paid_at: z.string().optional(),
  payment_method: z.string().optional(),
  payment_type: z.string().optional(),
  ewallet: z.string().optional(),
  status: z.enum([
    "paid",
    "pending",
    "failed",
    "expired",
    "cancelled",
    "challenge",
    "refunded",
    "partial_refunded",
  ]),
  store: z.string().optional(),
  store_id: z.string(),
  transaction_id: z.string(),
  webhook_id: z.string(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type CheckoutCancelQuery = z.infer<typeof checkoutCancelQuerySchema>;
export type CheckoutSuccessQuery = z.infer<typeof checkoutSuccessQuerySchema>;
export type PaymentHistoryQuery = z.infer<typeof paymentHistoryQuerySchema>;
export type PayGateWebhookPayload = z.infer<typeof payGateWebhookSchema>;
export type PaidPlan = z.infer<typeof paidPlanSchema>;
export type PaymentDuration = z.infer<typeof paymentDurationSchema>;
