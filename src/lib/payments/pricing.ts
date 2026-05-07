import type { PaidPlan, PaymentDuration } from "@/lib/validations/payment";

const MONTHLY_PLAN_PRICES_USD: Record<PaidPlan, number> = {
  BUSINESS: 19,
  PRO: 8,
};

export class PaymentConfigurationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export function calculatePlanAmountUsd({
  duration,
  plan,
}: {
  duration: PaymentDuration;
  plan: PaidPlan;
}): number {
  const monthlyPrice = MONTHLY_PLAN_PRICES_USD[plan];
  return duration === "YEARLY" ? monthlyPrice * 12 : monthlyPrice;
}

export function getUsdIdrRate(): number {
  const rawRate = process.env.USD_IDR_RATE?.trim();
  const rate = rawRate ? Number(rawRate) : Number.NaN;

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new PaymentConfigurationError("USD_IDR_RATE must be a positive number.");
  }

  return rate;
}

export function calculateGrossAmountIdr(amountUsd: number, usdIdrRate: number): number {
  const grossAmount = Math.round(amountUsd * usdIdrRate);

  if (!Number.isSafeInteger(grossAmount) || grossAmount <= 0) {
    throw new PaymentConfigurationError("Calculated IDR amount is invalid.");
  }

  return grossAmount;
}

export function formatPaymentItemName(plan: PaidPlan, duration: PaymentDuration): string {
  const planName = plan === "BUSINESS" ? "Business" : "Pro";
  const durationName = duration === "YEARLY" ? "Yearly" : "Monthly";

  return `LinkSnap ${planName} ${durationName}`;
}
