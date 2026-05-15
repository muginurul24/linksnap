import { describe, expect, it } from "vitest";
import { getFriendlyPayGateError } from "../../src/lib/payments/paygate-errors";
import { PayGateApiError } from "../../src/lib/payments/paygate";

describe("PayGate friendly errors", () => {
  it("should map PayGate transaction errors to user-safe messages", () => {
    const validation = getFriendlyPayGateError(
      new PayGateApiError(400, "Invalid charge payload.", {
        error: { code: "VALIDATION_ERROR" },
      }),
      "bsi",
    );
    expect(validation.message).toBe(
      "Payment details were rejected. Please choose another method or try again.",
    );
    expect(validation.details).toMatchObject({
      paymentMethod: "bsi",
      providerCode: "VALIDATION_ERROR",
      providerStatus: 400,
    });

    const conflict = getFriendlyPayGateError(
      new PayGateApiError(409, "Order conflict.", {
        error: { code: "TRANSACTION_CONFLICT" },
      }),
    );
    expect(conflict.message).toBe(
      "A checkout for this order is already being processed. Please wait a moment and try again.",
    );
  });

  it("should handle channel unavailable, amount mismatch, and timeout cases", () => {
    const channelUnavailable = getFriendlyPayGateError(
      new PayGateApiError(502, "Payment channel is not activated.", {
        error: { code: "MIDTRANS_ERROR" },
      }),
      "gopay",
    );
    expect(channelUnavailable.message).toBe(
      "This payment method is temporarily unavailable. Please choose another method.",
    );

    const amountMismatch = getFriendlyPayGateError(
      new PayGateApiError(400, "Amount mismatch.", {
        error: { code: "AMOUNT_MISMATCH" },
      }),
    );
    expect(amountMismatch.message).toBe(
      "Payment amount could not be verified. Please try again.",
    );

    const timeout = getFriendlyPayGateError(
      new PayGateApiError(504, "upstream timeout", {
        error: { code: "GATEWAY_TIMEOUT" },
      }),
    );
    expect(timeout.message).toBe(
      "Payment is taking longer than expected. Please check your email before trying again.",
    );
  });
});
