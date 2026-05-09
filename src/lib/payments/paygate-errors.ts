import { getChannelById } from "@/lib/payments/payment-channels";
import type { PayGateApiError } from "@/lib/payments/paygate";

type FriendlyPayGateError = {
  details: {
    paymentMethod?: string;
    providerCode?: string;
    providerStatus: number;
  };
  message: string;
};

const PAYGATE_ERROR_MESSAGES: Record<string, string> = {
  FORBIDDEN:
    "Payment provider is temporarily unavailable. Please contact support if it continues.",
  INTERNAL_ERROR:
    "Payment provider is temporarily unavailable. Please choose another method or try again.",
  MIDTRANS_ERROR:
    "Payment provider is temporarily unavailable. Please choose another method or try again.",
  STORE_INACTIVE:
    "Payment provider is temporarily unavailable. Please contact support if it continues.",
  TRANSACTION_CONFLICT:
    "A checkout for this order is already being processed. Please wait a moment and try again.",
  UNAUTHORIZED:
    "Payment provider is temporarily unavailable. Please contact support if it continues.",
  VALIDATION_ERROR:
    "Payment details were rejected. Please choose another method or try again.",
};

const TIMEOUT_ERROR_CODES = new Set([
  "GATEWAY_TIMEOUT",
  "REQUEST_TIMEOUT",
  "TIMEOUT",
  "UPSTREAM_TIMEOUT",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNestedString(
  value: unknown,
  keys: readonly string[],
): string | null {
  let cursor: unknown = value;

  for (const key of keys) {
    if (!isRecord(cursor)) return null;
    cursor = cursor[key];
  }

  return readString(cursor);
}

function getProviderCode(error: PayGateApiError): string | undefined {
  const details = error.details;
  const candidates = [
    readNestedString(details, ["error", "code"]),
    readNestedString(details, ["error", "name"]),
    readNestedString(details, ["code"]),
    readNestedString(details, ["name"]),
    readNestedString(details, ["status_code"]),
  ];

  return candidates.find((candidate) => candidate !== null) ?? undefined;
}

function getProviderMessage(error: PayGateApiError): string {
  const details = error.details;
  const candidates = [
    readNestedString(details, ["error", "message"]),
    readNestedString(details, ["message"]),
    readNestedString(details, ["status_message"]),
    error.message,
  ];

  return candidates.find((candidate) => candidate !== null) ?? error.message;
}

function isChannelUnavailable(providerMessage: string, providerCode?: string): boolean {
  const normalized = providerMessage.toLowerCase();

  return (
    providerCode === "PAYMENT_CHANNEL_UNAVAILABLE" ||
    providerCode === "402" ||
    normalized.includes("payment channel is not activated") ||
    normalized.includes("payment method is not activated") ||
    normalized.includes("payment channel unavailable") ||
    normalized.includes("payment method unavailable")
  );
}

function isAmountMismatch(providerMessage: string, providerCode?: string): boolean {
  return (
    providerCode === "AMOUNT_MISMATCH" ||
    /amount.+(mismatch|invalid|different)/i.test(providerMessage)
  );
}

function isTimeout(error: PayGateApiError, providerMessage: string, providerCode?: string) {
  return (
    error.status === 408 ||
    error.status === 504 ||
    (providerCode !== undefined && TIMEOUT_ERROR_CODES.has(providerCode)) ||
    /timeout|timed out|deadline/i.test(providerMessage)
  );
}

export function getFriendlyPayGateError(
  error: PayGateApiError,
  paymentMethod?: string | null,
): FriendlyPayGateError {
  const providerCode = getProviderCode(error);
  const providerMessage = getProviderMessage(error);
  const channel = paymentMethod ? getChannelById(paymentMethod) : undefined;
  const details = {
    paymentMethod: channel?.id ?? paymentMethod ?? undefined,
    providerCode,
    providerStatus: error.status,
  };

  if (isChannelUnavailable(providerMessage, providerCode)) {
    return {
      details,
      message:
        "This payment method is temporarily unavailable. Please choose another method.",
    };
  }

  if (isTimeout(error, providerMessage, providerCode)) {
    return {
      details,
      message:
        "Payment is taking longer than expected. Please check your email before trying again.",
    };
  }

  if (isAmountMismatch(providerMessage, providerCode)) {
    return {
      details,
      message: "Payment amount could not be verified. Please try again.",
    };
  }

  return {
    details,
    message:
      (providerCode && PAYGATE_ERROR_MESSAGES[providerCode]) ??
      "Payment provider rejected the transaction. Please choose another method or try again.",
  };
}
