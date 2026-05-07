import { describe, expect, it, vi } from "vitest";
import {
  buildMidtransSnapPayload,
  createMidtransSnapTransaction,
  MidtransApiError,
  MidtransConfigurationError,
} from "../../src/lib/payments/midtrans";

function createJsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

describe("Midtrans Snap client", () => {
  it("should build Snap payload with transaction, item, and customer details", () => {
    const payload = buildMidtransSnapPayload({
      customer: {
        email: "buyer@example.com",
        name: "Rafi Link",
      },
      duration: "MONTHLY",
      grossAmountIdr: 128000,
      orderId: "LS-123",
      plan: "PRO",
    });

    expect(payload).toEqual({
      credit_card: { secure: true },
      customer_details: {
        email: "buyer@example.com",
        first_name: "Rafi",
        last_name: "Link",
      },
      item_details: [
        {
          id: "linksnap-pro-monthly",
          name: "LinkSnap Pro Monthly",
          price: 128000,
          quantity: 1,
        },
      ],
      transaction_details: {
        gross_amount: 128000,
        order_id: "LS-123",
      },
    });
  });

  it("should create a sandbox Snap transaction using server-key Basic Auth", async () => {
    const requests: Array<{ init?: RequestInit; url: string }> = [];
    const fetcher = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ init, url: String(url) });
      return createJsonResponse(201, {
        redirect_url: "https://app.sandbox.midtrans.com/snap/v2/vtweb/token-1",
        token: "token-1",
      });
    }) as unknown as typeof fetch;

    const transaction = await createMidtransSnapTransaction(
      {
        customer: {
          email: "buyer@example.com",
          name: "Rafi",
        },
        duration: "MONTHLY",
        grossAmountIdr: 128000,
        orderId: "LS-123",
        plan: "PRO",
      },
      {
        fetcher,
        isProduction: false,
        serverKey: "server-key",
      },
    );

    expect(transaction).toEqual({
      redirectUrl: "https://app.sandbox.midtrans.com/snap/v2/vtweb/token-1",
      token: "token-1",
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe(
      "https://app.sandbox.midtrans.com/snap/v1/transactions",
    );

    const headers = new Headers(requests[0]?.init?.headers);
    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Authorization")).toBe(
      `Basic ${Buffer.from("server-key:").toString("base64")}`,
    );
    expect(JSON.parse(String(requests[0]?.init?.body))).toMatchObject({
      transaction_details: {
        gross_amount: 128000,
        order_id: "LS-123",
      },
    });
  });

  it("should use production endpoint when configured", async () => {
    const requests: string[] = [];
    const fetcher = vi.fn(async (url: RequestInfo | URL) => {
      requests.push(String(url));
      return createJsonResponse(201, {
        redirect_url: "https://app.midtrans.com/snap/v2/vtweb/token-1",
        token: "token-1",
      });
    }) as unknown as typeof fetch;

    await createMidtransSnapTransaction(
      {
        customer: {
          email: null,
          name: null,
        },
        duration: "YEARLY",
        grossAmountIdr: 3648000,
        orderId: "LS-456",
        plan: "BUSINESS",
      },
      {
        fetcher,
        isProduction: true,
        serverKey: "server-key",
      },
    );

    expect(requests).toEqual(["https://app.midtrans.com/snap/v1/transactions"]);
  });

  it("should require a server key", async () => {
    await expect(
      createMidtransSnapTransaction(
        {
          customer: {
            email: null,
            name: null,
          },
          duration: "MONTHLY",
          grossAmountIdr: 128000,
          orderId: "LS-123",
          plan: "PRO",
        },
        {
          serverKey: "",
        },
      ),
    ).rejects.toThrow(MidtransConfigurationError);
  });

  it("should surface Midtrans API failures", async () => {
    const fetcher = vi.fn(async () =>
      createJsonResponse(400, {
        error_message: ["transaction_details.gross_amount is invalid"],
      }),
    ) as unknown as typeof fetch;

    await expect(
      createMidtransSnapTransaction(
        {
          customer: {
            email: null,
            name: null,
          },
          duration: "MONTHLY",
          grossAmountIdr: 128000,
          orderId: "LS-123",
          plan: "PRO",
        },
        {
          fetcher,
          serverKey: "server-key",
        },
      ),
    ).rejects.toMatchObject({
      message: "transaction_details.gross_amount is invalid",
      status: 400,
    } satisfies Partial<MidtransApiError>);
  });
});
