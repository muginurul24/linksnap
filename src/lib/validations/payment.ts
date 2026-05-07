import { z } from "zod";

export const paidPlanSchema = z.enum(["PRO", "BUSINESS"]);
export const paymentDurationSchema = z.enum(["MONTHLY", "YEARLY"]);

export const createPaymentSchema = z
  .object({
    duration: paymentDurationSchema,
    plan: paidPlanSchema,
  })
  .strict();

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type PaidPlan = z.infer<typeof paidPlanSchema>;
export type PaymentDuration = z.infer<typeof paymentDurationSchema>;
