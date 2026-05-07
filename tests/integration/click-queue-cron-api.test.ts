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
  processCalls: [] as number[],
  result: {
    deadLettered: 1,
    processed: 7,
  },
}));

vi.mock("@/lib/analytics/click-queue", () => ({
  REDIRECT_CLICK_QUEUE_PROCESS_LIMIT: 100,
  processRedirectClickQueue: async ({ limit }: { limit?: number } = {}) => {
    mockState.processCalls.push(limit ?? 100);
    return mockState.result;
  },
}));

import { GET } from "../../src/app/api/v1/analytics/click-queue/process/route";

function createRequest(authorization?: string, limit?: string): NextRequest {
  const url = new URL("http://localhost:3000/api/v1/analytics/click-queue/process");
  if (limit) url.searchParams.set("limit", limit);

  return new NextRequest(url, {
    headers: authorization === undefined ? undefined : { authorization },
    method: "GET",
  });
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

describe("click queue cron API", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "cron-secret";
    mockState.processCalls = [];
    mockState.result = {
      deadLettered: 1,
      processed: 7,
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
    expect(mockState.processCalls).toEqual([]);
  });

  it("should reject unauthorized cron requests", async () => {
    const response = await GET(createRequest("Bearer wrong-secret"));
    const body = await readJson<unknown>(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(mockState.processCalls).toEqual([]);
  });

  it("should process queued clicks for authorized cron requests", async () => {
    const response = await GET(createRequest("Bearer cron-secret", "25"));
    const body = await readJson<{ deadLettered: number; processed: number }>(
      response,
    );

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data).toEqual({
      deadLettered: 1,
      processed: 7,
    });
    expect(mockState.processCalls).toEqual([25]);
  });
});
