import type { Metadata } from "next";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import PricingPage from "@/components/landing/pricing-page";
import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/auth/session-helpers";
import { findBillingUserById } from "@/lib/db/queries/payments";
import {
  buildPricingJsonLd,
  createPublicMetadata,
} from "@/lib/seo/metadata";
import { getCspNonce } from "@/lib/security/server-nonce";

const description =
  "Compare LinkSnap Free, Pro, and Business plans for short links, Link Pages, Smart Rules, QR codes, analytics, API access, and campaign workflows.";

export const metadata: Metadata = {
  ...createPublicMetadata({
    title: "Pricing",
    description,
    path: "/pricing",
  }),
};

export default async function PricingRoute() {
  const nonce = await getCspNonce();
  const session = await auth();
  const userId = getSessionUserId(session);
  const billingUser = userId ? await findBillingUserById(userId) : null;

  return (
    <>
      <JsonLdScript nonce={nonce} value={buildPricingJsonLd()} />
      <PricingPage currentPlan={billingUser?.plan ?? null} />
    </>
  );
}
