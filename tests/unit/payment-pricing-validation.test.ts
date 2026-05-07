import { afterEach, describe, expect, it } from "vitest";
import {
  calculateGrossAmountIdr,
  calculatePlanAmountUsd,
  getUsdIdrRate,
  PaymentConfigurationError,
} from "../../src/lib/payments/pricing";
import { createPaymentSchema } from "../../src/lib/validations/payment";

const originalUsdIdrRate = process.env.USD_IDR_RATE;

afterEach(() => {
  process.env.USD_IDR_RATE = originalUsdIdrRate;
});

describe("payment validation and pricing", () => {
  it("should accept paid plans and supported durations", () => {
    const parsed = createPaymentSchema.safeParse({
      duration: "YEARLY",
      plan: "BUSINESS",
    });

    expect(parsed.success).toBe(true);
  });

  it("should reject free plan and unsupported durations", () => {
    expect(
      createPaymentSchema.safeParse({
        duration: "MONTHLY",
        plan: "FREE",
      }).success,
    ).toBe(false);

    expect(
      createPaymentSchema.safeParse({
        duration: "WEEKLY",
        plan: "PRO",
      }).success,
    ).toBe(false);
  });

  it("should calculate monthly and yearly USD amounts", () => {
    expect(calculatePlanAmountUsd({ duration: "MONTHLY", plan: "PRO" })).toBe(8);
    expect(calculatePlanAmountUsd({ duration: "YEARLY", plan: "BUSINESS" })).toBe(
      228,
    );
  });

  it("should calculate IDR amount from configured USD rate", () => {
    process.env.USD_IDR_RATE = "16000";

    expect(getUsdIdrRate()).toBe(16000);
    expect(calculateGrossAmountIdr(8, getUsdIdrRate())).toBe(128000);
  });

  it("should reject invalid USD to IDR rate configuration", () => {
    process.env.USD_IDR_RATE = "0";

    expect(() => getUsdIdrRate()).toThrow(PaymentConfigurationError);
  });
});
