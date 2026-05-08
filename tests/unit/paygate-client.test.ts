import { describe, expect, it, vi } from "vitest";
import {
  buildPayGateChargePayload,
  createPayGateCharge,
  getPayGateTransaction,
  PayGateApiError,
  PayGateConfigurationError,
} from "../../src/lib/payments/paygate";

function createJsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

function createChargeInput() {
  return {
    callbackUrl: "https://linksnap.test/api/v1/payments/webhook",
    customer: {
      email: "buyer@example.com",
      name: "Rafi Link",
    },
    duration: "MONTHLY" as const,
    grossAmountIdr: 128000,
    orderId: "LS-123",
    plan: "PRO" as const,
  };
}

function createPayGateResponse(orderId = "LS-123") {
  return {
    data: {
      amount: 128000,
      midtrans: {
        fraud_status: "accept",
        transaction_id: "trx-1",
        transaction_status: "pending",
        va_numbers: [{ bank: "bca", va_number: "88001234567890" }],
      },
      order_id: orderId,
      payment_type: "bank_transfer",
      platform_order_id: `linksnap_${orderId}`,
      status: "pending",
      transaction_id: "paygate-transaction-1",
    },
    success: true,
  };
}

describe("PayGate client", () => {
  it("should build charge payload with required fields", () => {
    const payload = buildPayGateChargePayload({
      ...createChargeInput(),
      metadata: {
        campaign: "launch",
      },
    });

    expect(payload).toEqual({
      amount: 128000,
      bank: "bca",
      callback_url: "https://linksnap.test/api/v1/payments/webhook",
      currency: "IDR",
      customer: {
        email: "buyer@example.com",
        name: "Rafi Link",
      },
      items: [
        {
          id: "linksnap-pro-monthly",
          name: "LinkSnap Pro Monthly",
          price: 128000,
          quantity: 1,
        },
      ],
      metadata: {
        campaign: "launch",
        duration: "MONTHLY",
        plan: "PRO",
        source: "linksnap",
      },
      order_id: "LS-123",
      payment_type: "bank_transfer",
    });
  });

  it("should create a charge with auth and idempotency headers", async () => {
    const requests: Array<{ init?: RequestInit; url: string }> = [];
    const fetcher = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ init, url: String(url) });
      return createJsonResponse(201, createPayGateResponse());
    }) as unknown as typeof fetch;

    const transaction = await createPayGateCharge(createChargeInput(), {
      apiBaseUrl: "https://paygate.test/",
      fetcher,
      storeApiToken: "store-token",
    });

    expect(transaction.data.midtrans?.va_numbers).toEqual([
      { bank: "bca", va_number: "88001234567890" },
    ]);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe("https://paygate.test/v1/transactions/charge");

    const headers = new Headers(requests[0]?.init?.headers);
    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer store-token");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Idempotency-Key")).toBe("idem_LS-123");
    expect(JSON.parse(String(requests[0]?.init?.body))).toMatchObject({
      callback_url: "https://linksnap.test/api/v1/payments/webhook",
      order_id: "LS-123",
    });
  });

  it("should fetch transaction details with token kept server-side", async () => {
    const requests: Array<{ init?: RequestInit; url: string }> = [];
    const fetcher = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ init, url: String(url) });
      return createJsonResponse(200, createPayGateResponse("LS-456"));
    }) as unknown as typeof fetch;

    const transaction = await getPayGateTransaction("LS-456", {
      apiBaseUrl: "https://paygate.test",
      fetcher,
      storeApiToken: "store-token",
    });

    expect(transaction.data.order_id).toBe("LS-456");
    expect(requests[0]?.url).toBe("https://paygate.test/v1/transactions/LS-456");
    expect(new Headers(requests[0]?.init?.headers).get("Idempotency-Key")).toBe(
      "idem_lookup_LS-456",
    );
  });

  it("should require a store API token", async () => {
    await expect(
      createPayGateCharge(createChargeInput(), {
        storeApiToken: "",
      }),
    ).rejects.toThrow(PayGateConfigurationError);
  });

  it("should surface PayGate API failures", async () => {
    const fetcher = vi.fn(async () =>
      createJsonResponse(400, {
        message: "amount is invalid",
      }),
    ) as unknown as typeof fetch;

    await expect(
      createPayGateCharge(createChargeInput(), {
        fetcher,
        storeApiToken: "store-token",
      }),
    ).rejects.toMatchObject({
      details: {
        message: "amount is invalid",
      },
      message: "amount is invalid",
      status: 400,
    } satisfies Partial<PayGateApiError>);
  });
});
