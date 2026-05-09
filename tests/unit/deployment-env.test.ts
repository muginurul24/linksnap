import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const requiredProductionKeys = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_API_URL",
  "APP_URL",
  "AUTH_URL",
  "NEXTAUTH_URL",
  "AUTH_TRUST_HOST",
  "DATABASE_URL",
  "AUTH_SECRET",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "UPSTASH_REDIS_URL",
  "UPSTASH_REDIS_TOKEN",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "PAYGATE_API_BASE_URL",
  "PAYGATE_STORE_API_TOKEN",
  "PAYGATE_WEBHOOK_SECRET",
  "CRON_SECRET",
  "MAXMIND_DB_PATH",
  "IP_HASH_SALT",
  "USD_IDR_RATE",
] as const;

describe("production deployment environment", () => {
  it("should document every required production env var in .env.example", () => {
    const envExample = readFileSync(".env.example", "utf8");

    for (const key of requiredProductionKeys) {
      expect(envExample).toContain(`${key}=`);
    }

    expect(envExample).toContain("https://www.justqiu.cloud/api/v1/payments/webhook");
    expect(envExample).toContain(
      "https://www.justqiu.cloud/api/auth/callback/google",
    );
  });

  it("should document provider setup and verification commands in DEPLOY.md", () => {
    const deployGuide = readFileSync("DEPLOY.md", "utf8");

    for (const key of requiredProductionKeys) {
      expect(deployGuide).toContain(key);
    }

    expect(deployGuide).toContain("rtk bun run smoke:production");
    expect(deployGuide).toContain("rtk bun run security:smoke");
    expect(deployGuide).toContain("Vercel Cron");
    expect(deployGuide).toContain("Google OAuth");
    expect(deployGuide).toContain("PayGate webhook");
  });

  it("should pass the production env verifier with valid placeholder values", () => {
    const output = execFileSync("bash", ["scripts/verify-production-env.sh"], {
      encoding: "utf8",
      env: {
        ...process.env,
        APP_URL: "https://www.justqiu.cloud",
        AUTH_GOOGLE_ID: "google-client",
        AUTH_GOOGLE_SECRET: "google-secret",
        AUTH_SECRET: "abcdefghijklmnopqrstuvwxyz1234567890",
        AUTH_TRUST_HOST: "true",
        AUTH_URL: "https://www.justqiu.cloud",
        CRON_SECRET: "cron-secret-abcdefghijklmnopqrstuvwxyz",
        DATABASE_URL: "postgresql://user:pass@example.neon.tech/neondb",
        IP_HASH_SALT: "ip-salt-abcdefghijklmnopqrstuvwxyz",
        NEXT_PUBLIC_API_URL: "https://www.justqiu.cloud/api/v1",
        NEXT_PUBLIC_APP_URL: "https://www.justqiu.cloud",
        NEXTAUTH_URL: "https://www.justqiu.cloud",
        PAYGATE_API_BASE_URL: "https://paygate.digixsolution.net",
        PAYGATE_STORE_API_TOKEN: "store-token",
        PAYGATE_WEBHOOK_SECRET: "webhook-secret-1234567890",
        RESEND_API_KEY: "re_test",
        RESEND_FROM_EMAIL: "LinkSnap <noreply@justqiu.cloud>",
        UPSTASH_REDIS_TOKEN: "redis-token",
        UPSTASH_REDIS_URL: "https://redis.example",
        USD_IDR_RATE: "16000",
      },
    });

    expect(output).toContain("Production env verification passed");
  });
});
