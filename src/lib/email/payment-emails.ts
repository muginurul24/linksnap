import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { Resend } from "resend";
import type { PaidPlan, PaymentDuration } from "@/lib/validations/payment";

let resend: Resend | null = null;

type SendPaymentInvoiceEmailInput = {
  duration: PaymentDuration;
  grossAmountIdr: number;
  grossAmountUsd: number;
  orderId: string;
  plan: PaidPlan;
  to: string;
};

function getResend(): Resend {
  resend ??= new Resend(process.env.RESEND_API_KEY);
  return resend;
}

function formatCurrencyIdr(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);
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

  const amountIdr = formatCurrencyIdr(input.grossAmountIdr);
  const { error } = await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "LinkSnap <onboarding@resend.dev>",
    subject: `LinkSnap invoice ${input.orderId}`,
    text: [
      "Your LinkSnap payment has been settled.",
      `Order ID: ${input.orderId}`,
      `Plan: ${input.plan}`,
      `Duration: ${input.duration}`,
      `Amount: ${amountIdr} (${input.grossAmountUsd} USD)`,
    ].join("\n"),
    to: input.to,
  });

  if (error) {
    throw new Error(error.message);
  }
}
