import Stripe from "stripe";

const UNCONFIGURED_STRIPE_SECRET_KEY = "sk_test_unconfigured";

export type StripeClientConfig = {
  isTestMode?: boolean;
  secretKey?: string;
  webhookSecret?: string;
};

export class StripeConfigurationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

function getConfiguredValue(
  name: "STRIPE_SECRET_KEY" | "STRIPE_WEBHOOK_SECRET",
  override?: string,
): string {
  const value = override ?? process.env[name];
  const trimmed = value?.trim();

  if (!trimmed) {
    throw new StripeConfigurationError(`${name} is not configured.`);
  }

  return trimmed;
}

export function getStripeSecretKey(config?: StripeClientConfig): string {
  return getConfiguredValue("STRIPE_SECRET_KEY", config?.secretKey);
}

export function getStripeWebhookSecret(config?: StripeClientConfig): string {
  return getConfiguredValue("STRIPE_WEBHOOK_SECRET", config?.webhookSecret);
}

export function isStripeTestMode(config?: StripeClientConfig): boolean {
  if (config?.isTestMode !== undefined) return config.isTestMode;

  const rawValue = process.env.STRIPE_IS_TEST_MODE?.trim().toLowerCase();
  return rawValue === undefined || rawValue === "" || rawValue === "true";
}

export function assertStripeConfigured(config?: StripeClientConfig): void {
  getStripeSecretKey(config);
  getStripeWebhookSecret(config);
}

export function createStripeClient(config?: StripeClientConfig): Stripe {
  return new Stripe(getStripeSecretKey(config));
}

export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY?.trim() || UNCONFIGURED_STRIPE_SECRET_KEY,
);
