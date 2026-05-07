import type { PaidPlan, PaymentDuration } from "@/lib/validations/payment";
import { formatPaymentItemName } from "@/lib/payments/pricing";

const SNAP_ENDPOINTS = {
  production: "https://app.midtrans.com/snap/v1/transactions",
  sandbox: "https://app.sandbox.midtrans.com/snap/v1/transactions",
} as const;

type Fetcher = typeof fetch;

type MidtransCustomerDetails = {
  email?: string;
  first_name?: string;
  last_name?: string;
};

type MidtransItemDetails = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type MidtransSnapPayload = {
  credit_card: {
    secure: true;
  };
  customer_details?: MidtransCustomerDetails;
  item_details: MidtransItemDetails[];
  transaction_details: {
    gross_amount: number;
    order_id: string;
  };
};

type MidtransSnapRawResponse = {
  redirect_url?: unknown;
  token?: unknown;
};

type MidtransSnapCustomer = {
  email: string | null;
  name: string | null;
};

export type CreateMidtransSnapTransactionInput = {
  customer: MidtransSnapCustomer;
  duration: PaymentDuration;
  grossAmountIdr: number;
  orderId: string;
  plan: PaidPlan;
};

export type MidtransSnapTransaction = {
  redirectUrl: string;
  token: string;
};

export type MidtransClientConfig = {
  fetcher?: Fetcher;
  isProduction?: boolean;
  serverKey?: string;
};

export class MidtransConfigurationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class MidtransApiError extends Error {
  readonly details: unknown;
  readonly status: number;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.details = details;
    this.status = status;
  }
}

function getServerKey(config?: MidtransClientConfig): string {
  const serverKey = config?.serverKey ?? process.env.MIDTRANS_SERVER_KEY;
  const trimmed = serverKey?.trim();

  if (!trimmed) {
    throw new MidtransConfigurationError("MIDTRANS_SERVER_KEY is not configured.");
  }

  return trimmed;
}

export function assertMidtransConfigured(config?: MidtransClientConfig): void {
  getServerKey(config);
}

export function getMidtransServerKey(config?: MidtransClientConfig): string {
  return getServerKey(config);
}

function isProductionEnvironment(config?: MidtransClientConfig): boolean {
  if (config?.isProduction !== undefined) return config.isProduction;

  return process.env.MIDTRANS_IS_PRODUCTION?.trim().toLowerCase() === "true";
}

function getSnapEndpoint(config?: MidtransClientConfig): string {
  return isProductionEnvironment(config)
    ? SNAP_ENDPOINTS.production
    : SNAP_ENDPOINTS.sandbox;
}

function getAuthorizationHeader(serverKey: string): string {
  return `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;
}

function splitCustomerName(name: string | null): Pick<
  MidtransCustomerDetails,
  "first_name" | "last_name"
> {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return {};

  const [firstName, ...rest] = parts;
  return {
    first_name: firstName,
    ...(rest.length > 0 ? { last_name: rest.join(" ") } : {}),
  };
}

function buildCustomerDetails(
  customer: MidtransSnapCustomer,
): MidtransCustomerDetails | undefined {
  const details: MidtransCustomerDetails = {
    ...splitCustomerName(customer.name),
    ...(customer.email ? { email: customer.email } : {}),
  };

  return Object.keys(details).length > 0 ? details : undefined;
}

export function buildMidtransSnapPayload({
  customer,
  duration,
  grossAmountIdr,
  orderId,
  plan,
}: CreateMidtransSnapTransactionInput): MidtransSnapPayload {
  const customerDetails = buildCustomerDetails(customer);

  return {
    credit_card: { secure: true },
    ...(customerDetails ? { customer_details: customerDetails } : {}),
    item_details: [
      {
        id: `linksnap-${plan.toLowerCase()}-${duration.toLowerCase()}`,
        name: formatPaymentItemName(plan, duration),
        price: grossAmountIdr,
        quantity: 1,
      },
    ],
    transaction_details: {
      gross_amount: grossAmountIdr,
      order_id: orderId,
    },
  };
}

function parseMidtransResponse(body: MidtransSnapRawResponse): MidtransSnapTransaction {
  if (typeof body.token !== "string" || typeof body.redirect_url !== "string") {
    throw new MidtransApiError(
      502,
      "Midtrans returned an unexpected Snap transaction response.",
      body,
    );
  }

  return {
    redirectUrl: body.redirect_url,
    token: body.token,
  };
}

function getMidtransErrorMessage(body: unknown): string {
  if (!body || typeof body !== "object") {
    return "Midtrans failed to create a Snap transaction.";
  }

  const errorMessage = (body as { error_message?: unknown }).error_message;
  if (Array.isArray(errorMessage) && typeof errorMessage[0] === "string") {
    return errorMessage[0];
  }

  if (typeof errorMessage === "string") return errorMessage;

  return "Midtrans failed to create a Snap transaction.";
}

async function readJsonBody(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

export async function createMidtransSnapTransaction(
  input: CreateMidtransSnapTransactionInput,
  config?: MidtransClientConfig,
): Promise<MidtransSnapTransaction> {
  const serverKey = getServerKey(config);
  const fetcher = config?.fetcher ?? fetch;
  const response = await fetcher(getSnapEndpoint(config), {
    body: JSON.stringify(buildMidtransSnapPayload(input)),
    headers: {
      Accept: "application/json",
      Authorization: getAuthorizationHeader(serverKey),
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const body = await readJsonBody(response);

  if (!response.ok) {
    throw new MidtransApiError(
      response.status,
      getMidtransErrorMessage(body),
      body,
    );
  }

  return parseMidtransResponse(body as MidtransSnapRawResponse);
}
