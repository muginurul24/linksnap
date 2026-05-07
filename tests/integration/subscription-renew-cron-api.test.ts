import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type ApiEnvelope<T> =
  | { data: T; success: true }
  | {
      error: {
        code: string;
      };
      success: false;
    };

const mockState = vi.hoisted(() => ({
  expireCalls: 0,
  result: {
    downgradedUsers: 2,
    expiredSubscriptions: 2,
  },
}));

vi.mock("@/lib/payments/subscription", () => ({
  expireDueSubscriptions: async () => {
    mockState.expireCalls += 1;
    return mockState.result;
  },
}));

import { GET } from "../../src/app/api/v1/payments/subscriptions/renew/route";

function createRequest(authorization?: string): NextRequest {
  return new NextRequest(
    "http://localhost:3000/api/v1/payments/subscriptions/renew",
    {
      headers: authorization === undefined ? undefined : { authorization },
      method: "GET",
    },
  );
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

describe("subscription renew cron API", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "cron-secret";
    mockState.expireCalls = 0;
    mockState.result = {
      downgradedUsers: 2,
      expiredSubscriptions: 2,
    };
  });

  it("should require cron secret configuration", async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(createRequest("Bearer cron-secret"));
    const body = await readJson<unknown>(response);

    expect(response.status).toBe(503);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("CRON_CONFIGURATION_ERROR");
    expect(mockState.expireCalls).toBe(0);
  });

  it("should reject unauthorized cron requests", async () => {
    const response = await GET(createRequest("Bearer wrong-secret"));
    const body = await readJson<unknown>(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(mockState.expireCalls).toBe(0);
  });

  it("should expire due subscriptions for authorized cron requests", async () => {
    const response = await GET(createRequest("Bearer cron-secret"));
    const body = await readJson<{
      downgradedUsers: number;
      expiredSubscriptions: number;
    }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data).toEqual({
      downgradedUsers: 2,
      expiredSubscriptions: 2,
    });
    expect(mockState.expireCalls).toBe(1);
  });
});
