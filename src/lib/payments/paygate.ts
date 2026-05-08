import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { PaidPlan, PaymentDuration } from "@/lib/validations/payment";
import { formatPaymentItemName } from "@/lib/payments/pricing";

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

type PayGateChargePayload = {
  amount: number;
  bank: string;
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
  payment_type: "bank_transfer";
};

export type PayGateChargeInput = {
  bank?: string;
  callbackUrl: string;
  customer: PayGateCustomer;
  duration: PaymentDuration;
  grossAmountIdr: number;
  metadata?: Record<string, unknown>;
  orderId: string;
  plan: PaidPlan;
};

export type PayGateVaNumber = {
  bank: string;
  va_number: string;
};

export type PayGateChargeResponse = {
  success: true;
  data: {
    amount: number;
    currency?: string;
    expires_at?: string;
    midtrans?: {
      fraud_status?: string;
      transaction_id?: string;
      transaction_status?: string;
      va_numbers?: PayGateVaNumber[];
    };
    order_id: string;
    paid_at?: string;
    payment_type: string;
    platform_order_id?: string;
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

export function buildPayGateChargePayload(
  input: PayGateChargeInput,
): PayGateChargePayload {
  const customer = buildCustomerDetails(input.customer);

  return {
    amount: input.grossAmountIdr,
    bank: input.bank ?? "bca",
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
      ...input.metadata,
    },
    order_id: input.orderId,
    payment_type: "bank_transfer",
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
