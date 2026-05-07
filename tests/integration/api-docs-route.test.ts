import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserPlan } from "../../src/lib/links/limits";

type MockSession = {
  user: {
    id: string;
  };
} | null;

type ApiEnvelope<T> =
  | { data: T; success: true }
  | {
      error: {
        code: string;
      };
      success: false;
    };

const mockState = vi.hoisted(() => ({
  plan: "PRO" as UserPlan | null,
  session: { user: { id: "user-1" } } as MockSession,
}));

vi.mock("@/lib/auth", () => ({
  auth: async () => mockState.session,
}));

vi.mock("@/lib/db/queries/payments", () => ({
  findBillingUserById: async () =>
    mockState.plan
      ? { email: "user@example.com", name: "User", plan: mockState.plan }
      : null,
}));

import { GET } from "../../src/app/api/v1/docs/route";
import { createOpenApiSpec } from "../../src/lib/api-docs/spec";

type OpenApiSpec = ReturnType<typeof createOpenApiSpec>;

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

describe("API docs route", () => {
  beforeEach(() => {
    mockState.plan = "PRO";
    mockState.session = { user: { id: "user-1" } };
  });

  it("should return OpenAPI JSON for paid users", async () => {
    const response = await GET();
    const body = await readJson<OpenApiSpec>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data.openapi).toBe("3.1.0");
    expect(body.data.info.title).toBe("LinkSnap API");
    expect(body.data.paths["/api/v1/links"]).toHaveProperty("get");
    expect(body.data.paths["/api/v1/docs"]).toHaveProperty("get");
  });

  it("should reject free users", async () => {
    mockState.plan = "FREE";

    const response = await GET();
    const body = await readJson<OpenApiSpec>(response);

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("PLAN_UPGRADE_REQUIRED");
  });

  it("should reject unauthenticated users", async () => {
    mockState.session = null;

    const response = await GET();
    const body = await readJson<OpenApiSpec>(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });
});
