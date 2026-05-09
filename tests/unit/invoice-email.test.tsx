import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  PaymentInvoiceEmail,
  buildPaymentInvoiceEmailProps,
  buildPaymentInvoiceEmailText,
  formatPaymentMethodLabel,
} from "../../src/lib/email/invoice-email";

describe("payment invoice email", () => {
  it("should include complete settlement and subscription details", () => {
    const props = buildPaymentInvoiceEmailProps({
      duration: "MONTHLY",
      grossAmountIdr: 128000,
      grossAmountUsd: 8,
      orderId: "LS-123",
      paidAt: new Date("2026-05-07T01:00:00.000Z"),
      paymentMethod: "bca",
      periodEnd: new Date("2026-06-07T01:00:00.000Z"),
      periodStart: new Date("2026-05-07T01:00:00.000Z"),
      plan: "PRO",
      providerTransactionId: "paygate-transaction-1",
    });

    expect(props).toMatchObject({
      duration: "Monthly",
      orderId: "LS-123",
      paymentMethod: "BCA Virtual Account",
      plan: "PRO",
      transactionId: "paygate-transaction-1",
    });
    expect(props.amount).toContain("128.000");
    expect(props.date).toContain("May 7, 2026");
    expect(props.period).toContain("May 7, 2026");
    expect(props.period).toContain("Jun 7, 2026");

    const markup = renderToStaticMarkup(<PaymentInvoiceEmail {...props} />);
    expect(markup).toContain("LinkSnap invoice");
    expect(markup).toContain("BCA Virtual Account");
    expect(markup).toContain("paygate-transaction-1");
    expect(markup).toContain("LS-123");
    expect(markup).toContain("Subscription period");

    const text = buildPaymentInvoiceEmailText(props);
    expect(text).toContain("Amount:");
    expect(text).toContain("128.000");
    expect(text).toContain("Payment method: BCA Virtual Account");
    expect(text).toContain("Transaction ID: paygate-transaction-1");
  });

  it("should format provider payment types when exact channel is unavailable", () => {
    expect(formatPaymentMethodLabel("bank_transfer")).toBe("Bank Transfer");
    expect(formatPaymentMethodLabel("ewallet")).toBe("E-Wallet");
    expect(formatPaymentMethodLabel("qris")).toBe("QRIS");
    expect(formatPaymentMethodLabel(null)).toBe("Not available");
  });
});
