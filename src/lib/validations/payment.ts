import { z } from "zod";

export const paidPlanSchema = z.enum(["PRO", "BUSINESS"]);
export const paymentDurationSchema = z.enum(["MONTHLY", "YEARLY"]);

export const createPaymentSchema = z
  .object({
    duration: paymentDurationSchema,
    plan: paidPlanSchema,
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
      .regex(/^LS-\d{13}-[a-f0-9]{12}$/, "Order ID is invalid"),
  })
  .strict();

export const checkoutCancelQuerySchema = z
  .object({
    order_id: z
      .string()
      .max(100, "Order ID is too long")
      .regex(/^LS-\d{13}-[a-f0-9]{12}$/, "Order ID is invalid")
      .optional(),
    status: z.enum(["error", "unfinish"]).optional(),
  })
  .strict();

export const midtransWebhookNotificationSchema = z
  .object({
    fraud_status: z.string().optional(),
    gross_amount: z.string().min(1, "Gross amount is required"),
    order_id: z.string().min(1, "Order ID is required").max(100),
    payment_type: z.string().max(50).optional(),
    settlement_time: z.string().optional(),
    signature_key: z.string().min(1, "Signature key is required"),
    status_code: z.string().min(1, "Status code is required").max(10),
    transaction_status: z.string().min(1, "Transaction status is required"),
    transaction_time: z.string().optional(),
  })
  .passthrough();

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type CheckoutCancelQuery = z.infer<typeof checkoutCancelQuerySchema>;
export type CheckoutSuccessQuery = z.infer<typeof checkoutSuccessQuerySchema>;
export type PaymentHistoryQuery = z.infer<typeof paymentHistoryQuerySchema>;
export type MidtransWebhookNotification = z.infer<
  typeof midtransWebhookNotificationSchema
>;
export type PaidPlan = z.infer<typeof paidPlanSchema>;
export type PaymentDuration = z.infer<typeof paymentDurationSchema>;
