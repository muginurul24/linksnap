import { createPaymentSchema } from "@/lib/validations/payment";

export const createStripeCheckoutSchema = createPaymentSchema;

export type CreateStripeCheckoutInput = typeof createStripeCheckoutSchema._output;
