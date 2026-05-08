import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { MobileAuthUser } from "@/lib/db/queries/mobile-auth";
import type { UserPlan } from "@/lib/links/limits";

export const MOBILE_ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const MOBILE_ACCESS_TOKEN_TYPE = "linksnap.mobile.access";
const MOBILE_REFRESH_TOKEN_BYTES = 48;

export type MobileAccessTokenPayload = {
  email: string;
  exp: number;
  iat: number;
  plan: UserPlan;
  role: string;
  sub: string;
  typ: typeof MOBILE_ACCESS_TOKEN_TYPE;
};

export class MobileTokenConfigurationError extends Error {
  constructor() {
    super("Mobile token signing is not configured.");
  }
}

function getSigningSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new MobileTokenConfigurationError();
  }
  return secret;
}

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(input: string): string {
  return createHmac("sha256", getSigningSecret())
    .update(input)
    .digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function createMobileAccessToken(
  user: Pick<MobileAuthUser, "email" | "id" | "plan" | "role">,
  now = new Date(),
): string {
  const iat = Math.floor(now.getTime() / 1000);
  const header = base64UrlJson({ alg: "HS256", typ: "JWT" });
  const payload = base64UrlJson({
    email: user.email,
    exp: iat + MOBILE_ACCESS_TOKEN_TTL_SECONDS,
    iat,
    plan: user.plan,
    role: user.role,
    sub: user.id,
    typ: MOBILE_ACCESS_TOKEN_TYPE,
  } satisfies MobileAccessTokenPayload);
  const signingInput = `${header}.${payload}`;

  return `${signingInput}.${sign(signingInput)}`;
}

export function verifyMobileAccessToken(
  token: string,
  now = new Date(),
): MobileAccessTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  if (!header || !payload || !signature) return null;

  const signingInput = `${header}.${payload}`;
  if (!safeEqual(sign(signingInput), signature)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<MobileAccessTokenPayload>;
    const nowSeconds = Math.floor(now.getTime() / 1000);
    if (
      decoded.typ !== MOBILE_ACCESS_TOKEN_TYPE ||
      typeof decoded.sub !== "string" ||
      typeof decoded.email !== "string" ||
      typeof decoded.role !== "string" ||
      typeof decoded.plan !== "string" ||
      typeof decoded.iat !== "number" ||
      typeof decoded.exp !== "number" ||
      decoded.exp <= nowSeconds
    ) {
      return null;
    }

    return decoded as MobileAccessTokenPayload;
  } catch {
    return null;
  }
}

export function createMobileRefreshToken(): string {
  return randomBytes(MOBILE_REFRESH_TOKEN_BYTES).toString("base64url");
}

export function hashMobileRefreshToken(refreshToken: string): string {
  return createHash("sha256").update(refreshToken).digest("hex");
}
