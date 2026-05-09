import type { CSSProperties } from "react";
import { getChannelById } from "@/lib/payments/payment-channels";
import type { PaidPlan, PaymentDuration } from "@/lib/validations/payment";

const EMAIL_TIME_ZONE = "Asia/Jakarta";
const NOT_AVAILABLE = "Not available";

export type PaymentInvoiceEmailInput = {
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
};

export type PaymentInvoiceEmailProps = {
  amount: string;
  date: string;
  duration: string;
  orderId: string;
  paymentMethod: string;
  period: string;
  plan: PaidPlan;
  transactionId: string;
};

type InvoiceRow = {
  label: string;
  value: string;
};

const containerStyle: CSSProperties = {
  backgroundColor: "#f8fafc",
  color: "#0f172a",
  fontFamily:
    "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  lineHeight: 1.5,
  margin: 0,
  padding: "32px 16px",
};

const cardStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  margin: "0 auto",
  maxWidth: "600px",
  padding: "32px",
};

const headingStyle: CSSProperties = {
  fontSize: "24px",
  lineHeight: "32px",
  margin: "0 0 8px",
};

const mutedStyle: CSSProperties = {
  color: "#475569",
  fontSize: "14px",
  margin: "0 0 24px",
};

const tableStyle: CSSProperties = {
  borderCollapse: "collapse",
  width: "100%",
};

const labelCellStyle: CSSProperties = {
  borderTop: "1px solid #e2e8f0",
  color: "#64748b",
  fontSize: "13px",
  padding: "12px 0",
  verticalAlign: "top",
  width: "36%",
};

const valueCellStyle: CSSProperties = {
  borderTop: "1px solid #e2e8f0",
  color: "#0f172a",
  fontSize: "14px",
  fontWeight: 600,
  padding: "12px 0 12px 16px",
  textAlign: "right",
  verticalAlign: "top",
};

const footerStyle: CSSProperties = {
  color: "#64748b",
  fontSize: "12px",
  margin: "24px 0 0",
};

function formatCurrencyIdr(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);
}

function formatCurrencyUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: EMAIL_TIME_ZONE,
    timeZoneName: "short",
    year: "numeric",
  }).format(date);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: EMAIL_TIME_ZONE,
    year: "numeric",
  }).format(date);
}

function formatDuration(duration: PaymentDuration): string {
  return duration === "YEARLY" ? "Yearly" : "Monthly";
}

function titleizePaymentMethod(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatPaymentMethodLabel(paymentMethod: string | null): string {
  if (!paymentMethod) return NOT_AVAILABLE;

  const channel = getChannelById(paymentMethod);
  if (channel) return channel.name;

  switch (paymentMethod) {
    case "bank_transfer":
      return "Bank Transfer";
    case "cstore":
      return "Convenience Store";
    case "ewallet":
      return "E-Wallet";
    case "qris":
      return "QRIS";
    default:
      return titleizePaymentMethod(paymentMethod);
  }
}

export function buildPaymentInvoiceEmailProps(
  input: PaymentInvoiceEmailInput,
): PaymentInvoiceEmailProps {
  const paidAt = input.paidAt ?? input.periodStart;
  const amountIdr = formatCurrencyIdr(input.grossAmountIdr);
  const amountUsd = formatCurrencyUsd(input.grossAmountUsd);

  return {
    amount: `${amountIdr} (${amountUsd})`,
    date: formatDateTime(paidAt),
    duration: formatDuration(input.duration),
    orderId: input.orderId,
    paymentMethod: formatPaymentMethodLabel(input.paymentMethod),
    period: `${formatDate(input.periodStart)} - ${formatDate(input.periodEnd)}`,
    plan: input.plan,
    transactionId: input.providerTransactionId ?? NOT_AVAILABLE,
  };
}

function buildRows(props: PaymentInvoiceEmailProps): InvoiceRow[] {
  return [
    { label: "Plan", value: `${props.plan} - ${props.duration}` },
    { label: "Amount", value: props.amount },
    { label: "Payment method", value: props.paymentMethod },
    { label: "Transaction ID", value: props.transactionId },
    { label: "Order ID", value: props.orderId },
    { label: "Payment date", value: props.date },
    { label: "Subscription period", value: props.period },
  ];
}

export function buildPaymentInvoiceEmailText(
  props: PaymentInvoiceEmailProps,
): string {
  return [
    "Your LinkSnap payment has been settled.",
    ...buildRows(props).map((row) => `${row.label}: ${row.value}`),
  ].join("\n");
}

export function PaymentInvoiceEmail(props: PaymentInvoiceEmailProps) {
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={headingStyle}>LinkSnap invoice</h1>
        <p style={mutedStyle}>
          Your payment has been settled and your subscription is now active.
        </p>
        <table style={tableStyle}>
          <tbody>
            {buildRows(props).map((row) => (
              <tr key={row.label}>
                <td style={labelCellStyle}>{row.label}</td>
                <td style={valueCellStyle}>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={footerStyle}>
          Keep this email for your records. No action is required.
        </p>
      </div>
    </div>
  );
}
