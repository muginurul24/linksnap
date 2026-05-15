import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { PaidPlan, PaymentDuration } from "@/lib/validations/payment";
import { formatPaymentItemName } from "@/lib/payments/pricing";
import {
  PAYGATE_BANK_CODES,
  PAYGATE_CSTORE_CODES,
  PAYGATE_EWALLET_CODES,
  PAYGATE_QRIS_CODES,
  type BankCode,
  type CstoreCode,
  type EwalletCode,
  type PaymentChannelCode,
  type PayGateResolvedPaymentChannel,
  type QrisCode,
} from "@/lib/payments/payment-channel-codes";

export {
  PAYGATE_BANK_CODES,
  PAYGATE_CSTORE_CODES,
  PAYGATE_EWALLET_CODES,
  PAYGATE_QRIS_CODES,
};
export type {
  BankCode,
  BankTransfer,
  ConvenienceStore,
  CstoreCode,
  Ewallet,
  EwalletCode,
  PayGatePaymentType,
  PayGateResolvedPaymentChannel as PaymentChannel,
  PaymentChannelCode,
  Qris,
  QrisCode,
} from "@/lib/payments/payment-channel-codes";

type PaymentChannel = PayGateResolvedPaymentChannel;

const DEFAULT_PAYGATE_API_BASE_URL = "https://paygate.digixsolution.net";

type Fetcher = typeof fetch;
type PayGateResponseLike = Pick<Response, "json" | "ok" | "status">;

type PayGateCustomer = {
  email: string | null;
  name: string | null;
  phone?: string | null;
};

type PayGateChargeItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type PayGateBaseChargePayload = {
  amount: number;
  callback_url: string;
  currency: "IDR";
  customer?: {
    email?: string;
    name?: string;
    phone?: string;
  };
  items: PayGateChargeItem[];
  metadata: Record<string, unknown>;
  order_id: string;
};

type PayGateBankTransferPayload = PayGateBaseChargePayload & {
  bank: BankCode;
  payment_type: "bank_transfer";
};
type PayGateEwalletPayload = PayGateBaseChargePayload & {
  ewallet: EwalletCode;
  payment_type: "ewallet";
};
type PayGateQrisPayload = PayGateBaseChargePayload & {
  acquirer: "gopay";
  payment_type: "qris";
};
type PayGateCstorePayload = PayGateBaseChargePayload & {
  payment_type: "cstore";
  store: CstoreCode;
};

export type PayGateChargePayload =
  | PayGateBankTransferPayload
  | PayGateCstorePayload
  | PayGateEwalletPayload
  | PayGateQrisPayload;

export type PayGateChargeInput = {
  bank?: BankCode;
  callbackUrl: string;
  customer: PayGateCustomer;
  duration: PaymentDuration;
  ewallet?: EwalletCode;
  grossAmountIdr: number;
  metadata?: Record<string, unknown>;
  orderId: string;
  paymentMethod?: PaymentChannelCode;
  plan: PaidPlan;
  store?: CstoreCode;
};

export type PayGateVaNumber = {
  bank: string;
  va_number: string;
};

export type PayGatePaymentAction = {
  method?: string;
  name?: string;
  type?: string;
  url?: string;
};

export type PayGateChargeResponse = {
  success: true;
  data: {
    amount: number;
    actions?: PayGatePaymentAction[];
    bill_key?: string;
    biller_code?: string;
    cstore?: CstoreCode | string;
    currency?: string;
    expires_at?: string;
    midtrans?: {
      actions?: PayGatePaymentAction[];
      bill_key?: string;
      biller_code?: string;
      cstore?: CstoreCode | string;
      fraud_status?: string;
      payment_code?: string;
      qr_string?: string;
      qr_url?: string;
      transaction_id?: string;
      transaction_status?: string;
      va_numbers?: PayGateVaNumber[];
    };
    order_id: string;
    paid_at?: string;
    payment_code?: string;
    payment_method?: PaymentChannelCode | string;
    payment_type: string;
    platform_order_id?: string;
    qr_string?: string;
    qr_url?: string;
    status: string;
    transaction_id: string;
  };
};

export type PayGateTransactionResponse = PayGateChargeResponse;

export type PayGateClientConfig = {
  apiBaseUrl?: string;
  fetcher?: Fetcher;
  storeApiToken?: string;
};

export class PayGateConfigurationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class PayGateApiError extends Error {
  readonly details: unknown;
  readonly status: number;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.details = details;
    this.status = status;
  }
}

export class PayGateUnsupportedChannelError extends Error {
  readonly paymentMethod: string;

  constructor(paymentMethod: string) {
    super(`Unsupported PayGate payment channel: ${paymentMethod}.`);
    this.paymentMethod = paymentMethod;
  }
}

function getStoreApiToken(config?: PayGateClientConfig): string {
  const token = config?.storeApiToken ?? process.env.PAYGATE_STORE_API_TOKEN;
  const trimmed = token?.trim();

  if (!trimmed) {
    throw new PayGateConfigurationError("PAYGATE_STORE_API_TOKEN is not configured.");
  }

  return trimmed;
}

function getApiBaseUrl(config?: PayGateClientConfig): string {
  const apiBaseUrl =
    config?.apiBaseUrl?.trim() ?? process.env.PAYGATE_API_BASE_URL?.trim();

  if (!apiBaseUrl) return DEFAULT_PAYGATE_API_BASE_URL;

  return apiBaseUrl.replace(/\/+$/, "");
}

export function assertPayGateConfigured(config?: PayGateClientConfig): void {
  getStoreApiToken(config);
}

function buildCustomerDetails(
  customer: PayGateCustomer,
): PayGateChargePayload["customer"] | undefined {
  const details = {
    ...(customer.email ? { email: customer.email } : {}),
    ...(customer.name ? { name: customer.name } : {}),
    ...(customer.phone ? { phone: customer.phone } : {}),
  };

  return Object.keys(details).length > 0 ? details : undefined;
}

function isBankCode(value: string): value is BankCode {
  return PAYGATE_BANK_CODES.includes(value as BankCode);
}

function isEwalletCode(value: string): value is EwalletCode {
  return PAYGATE_EWALLET_CODES.includes(value as EwalletCode);
}

function isCstoreCode(value: string): value is CstoreCode {
  return PAYGATE_CSTORE_CODES.includes(value as CstoreCode);
}

function isQrisCode(value: string): value is QrisCode {
  return PAYGATE_QRIS_CODES.includes(value as QrisCode);
}

export function resolvePayGatePaymentChannel(
  input: Pick<PayGateChargeInput, "bank" | "ewallet" | "paymentMethod" | "store">,
): PaymentChannel {
  const requestedPaymentMethod: string =
    input.paymentMethod ?? input.bank ?? input.ewallet ?? input.store ?? "qris_gopay";
  const paymentMethod =
    requestedPaymentMethod === "qris" ? "qris_gopay" : requestedPaymentMethod;

  if (isBankCode(paymentMethod)) {
    return {
      bank: paymentMethod,
      paymentMethod,
      paymentType: "bank_transfer",
    };
  }

  if (isEwalletCode(paymentMethod)) {
    return {
      ewallet: paymentMethod,
      paymentMethod,
      paymentType: "ewallet",
    };
  }

  if (isQrisCode(paymentMethod)) {
    return {
      acquirer: "gopay",
      paymentMethod,
      paymentType: "qris",
    };
  }

  if (isCstoreCode(paymentMethod)) {
    return {
      paymentMethod,
      paymentType: "cstore",
      store: paymentMethod,
    };
  }

  throw new PayGateUnsupportedChannelError(paymentMethod);
}

function buildPaymentChannelPayload(
  channel: PaymentChannel,
): Pick<PayGateBankTransferPayload, "bank" | "payment_type"> |
  Pick<PayGateEwalletPayload, "ewallet" | "payment_type"> |
  Pick<PayGateQrisPayload, "acquirer" | "payment_type"> |
  Pick<PayGateCstorePayload, "payment_type" | "store"> {
  if (channel.paymentType === "bank_transfer") {
    return { bank: channel.bank, payment_type: "bank_transfer" };
  }

  if (channel.paymentType === "ewallet") {
    return { ewallet: channel.ewallet, payment_type: "ewallet" };
  }

  if (channel.paymentType === "cstore") {
    return { payment_type: "cstore", store: channel.store };
  }

  return { acquirer: channel.acquirer, payment_type: "qris" };
}

export function buildPayGateChargePayload(
  input: PayGateChargeInput,
): PayGateChargePayload {
  const customer = buildCustomerDetails(input.customer);
  const channel = resolvePayGatePaymentChannel(input);
  const channelPayload = buildPaymentChannelPayload(channel);

  return {
    amount: input.grossAmountIdr,
    callback_url: input.callbackUrl,
    currency: "IDR",
    ...(customer ? { customer } : {}),
    items: [
      {
        id: `linksnap-${input.plan.toLowerCase()}-${input.duration.toLowerCase()}`,
        name: formatPaymentItemName(input.plan, input.duration),
        price: input.grossAmountIdr,
        quantity: 1,
      },
    ],
    metadata: {
      source: "linksnap",
      plan: input.plan,
      duration: input.duration,
      paymentMethod: channel.paymentMethod,
      paymentType: channel.paymentType,
      ...input.metadata,
    },
    order_id: input.orderId,
    ...channelPayload,
  };
}

function getPayGateErrorMessage(body: unknown): string {
  if (!body || typeof body !== "object") {
    return "PayGate failed to create a transaction.";
  }

  const message = (body as { error?: unknown; message?: unknown }).message;
  if (typeof message === "string" && message.trim()) return message;

  const error = (body as { error?: unknown }).error;
  if (typeof error === "string" && error.trim()) return error;

  return "PayGate failed to create a transaction.";
}

async function readJsonBody(response: PayGateResponseLike): Promise<unknown> {
  return response.json().catch(() => null);
}

function requestWithNodeHttp(
  url: string,
  init: {
    body?: string;
    headers: Record<string, string>;
    method: "GET" | "POST";
  },
): Promise<PayGateResponseLike> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const request = parsedUrl.protocol === "http:" ? httpRequest : httpsRequest;
    const body = init.body ?? "";
    const headers = {
      ...init.headers,
      ...(body ? { "Content-Length": Buffer.byteLength(body).toString() } : {}),
    };

    const outgoingRequest = request(
      parsedUrl,
      {
        headers,
        method: init.method,
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on("data", (chunk: Buffer | string) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        response.on("end", () => {
          const status = response.statusCode ?? 0;
          const responseText = Buffer.concat(chunks).toString("utf8");

          resolve({
            json: async () => JSON.parse(responseText),
            ok: status >= 200 && status < 300,
            status,
          });
        });
      },
    );

    outgoingRequest.on("error", reject);

    if (body) outgoingRequest.write(body);
    outgoingRequest.end();
  });
}

async function sendPayGateRequest(
  url: string,
  init: {
    body?: string;
    headers: Record<string, string>;
    method: "GET" | "POST";
  },
  config?: PayGateClientConfig,
): Promise<PayGateResponseLike> {
  if (config?.fetcher) {
    return config.fetcher(url, init);
  }

  return requestWithNodeHttp(url, init);
}

function parsePayGateTransactionResponse(body: unknown): PayGateTransactionResponse {
  if (
    !body ||
    typeof body !== "object" ||
    (body as { success?: unknown }).success !== true
  ) {
    throw new PayGateApiError(
      502,
      "PayGate returned an unexpected transaction response.",
      body,
    );
  }

  const data = (body as { data?: unknown }).data;
  if (!data || typeof data !== "object") {
    throw new PayGateApiError(
      502,
      "PayGate returned an unexpected transaction response.",
      body,
    );
  }

  const transactionId = (data as { transaction_id?: unknown }).transaction_id;
  const orderId = (data as { order_id?: unknown }).order_id;
  const status = (data as { status?: unknown }).status;
  const paymentType = (data as { payment_type?: unknown }).payment_type;
  const amount = (data as { amount?: unknown }).amount;

  if (
    typeof transactionId !== "string" ||
    typeof orderId !== "string" ||
    typeof status !== "string" ||
    typeof paymentType !== "string" ||
    typeof amount !== "number"
  ) {
    throw new PayGateApiError(
      502,
      "PayGate returned an unexpected transaction response.",
      body,
    );
  }

  return body as PayGateChargeResponse;
}

export async function createPayGateCharge(
  input: PayGateChargeInput,
  config?: PayGateClientConfig,
): Promise<PayGateChargeResponse> {
  const storeApiToken = getStoreApiToken(config);
  const response = await sendPayGateRequest(`${getApiBaseUrl(config)}/v1/transactions/charge`, {
    body: JSON.stringify(buildPayGateChargePayload(input)),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${storeApiToken}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `idem_${input.orderId}`,
    },
    method: "POST",
  }, config);
  const body = await readJsonBody(response);

  if (!response.ok) {
    throw new PayGateApiError(
      response.status,
      getPayGateErrorMessage(body),
      body,
    );
  }

  return parsePayGateTransactionResponse(body);
}

export async function getPayGateTransaction(
  orderId: string,
  config?: PayGateClientConfig,
): Promise<PayGateTransactionResponse> {
  const storeApiToken = getStoreApiToken(config);
  const response = await sendPayGateRequest(
    `${getApiBaseUrl(config)}/v1/transactions/${encodeURIComponent(orderId)}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${storeApiToken}`,
        "Idempotency-Key": `idem_lookup_${orderId}`,
      },
      method: "GET",
    },
    config,
  );
  const body = await readJsonBody(response);

  if (!response.ok) {
    throw new PayGateApiError(
      response.status,
      getPayGateErrorMessage(body),
      body,
    );
  }

  return parsePayGateTransactionResponse(body);
}
