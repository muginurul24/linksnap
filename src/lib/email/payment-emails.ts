import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { createElement } from "react";
import { Resend } from "resend";
import {
  PaymentInvoiceEmail,
  buildPaymentInvoiceEmailProps,
  buildPaymentInvoiceEmailText,
} from "@/lib/email/invoice-email";
import type {
  PaidPlan,
  PaymentDuration,
} from "@/lib/validations/payment";

let resend: Resend | null = null;

type SendPaymentInvoiceEmailInput = {
  duration: PaymentDuration;
  grossAmountIdr: number;
  grossAmountUsd: number;
  orderId: string;
  paidAt: Date | null;
  paymentMethod: string | null;
  periodEnd: Date;
  periodStart: Date;
  plan: PaidPlan;
  providerTransactionId: string | null;
  to: string;
};

function getResend(): Resend {
  resend ??= new Resend(process.env.RESEND_API_KEY);
  return resend;
}

async function writeInvoiceEmailToFile(
  input: SendPaymentInvoiceEmailInput,
): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("File payment email delivery is disabled in production.");
  }

  const emailFile = process.env.PAYMENT_EMAIL_FILE ?? ".e2e/payment-emails.jsonl";
  await mkdir(dirname(emailFile), { recursive: true });
  await appendFile(
    emailFile,
    `${JSON.stringify({
      ...input,
      sentAt: new Date().toISOString(),
      type: "payment_invoice",
    })}\n`,
    "utf8",
  );
}

export async function sendPaymentInvoiceEmail(
  input: SendPaymentInvoiceEmailInput,
): Promise<void> {
  if (process.env.PAYMENT_EMAIL_DELIVERY === "file") {
    await writeInvoiceEmailToFile(input);
    return;
  }

  const invoice = buildPaymentInvoiceEmailProps(input);
  const { error } = await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "LinkSnap <onboarding@resend.dev>",
    react: createElement(PaymentInvoiceEmail, invoice),
    subject: `LinkSnap invoice ${input.orderId}`,
    text: buildPaymentInvoiceEmailText(invoice),
    to: input.to,
  });

  if (error) {
    throw new Error(error.message);
  }
}
