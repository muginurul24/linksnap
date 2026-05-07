import { z } from "zod";

export const paidPlanSchema = z.enum(["PRO", "BUSINESS"]);
export const paymentDurationSchema = z.enum(["MONTHLY", "YEARLY"]);

export const createPaymentSchema = z
  .object({
    duration: paymentDurationSchema,
    plan: paidPlanSchema,
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
export type MidtransWebhookNotification = z.infer<
  typeof midtransWebhookNotificationSchema
>;
export type PaidPlan = z.infer<typeof paidPlanSchema>;
export type PaymentDuration = z.infer<typeof paymentDurationSchema>;
