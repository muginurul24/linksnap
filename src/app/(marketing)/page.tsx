import type { Metadata } from "next";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import LandingPage from "@/components/landing/landing-page";
import {
  buildHomeJsonLd,
  createPublicMetadata,
  siteConfig,
} from "@/lib/seo/metadata";
import { getCspNonce } from "@/lib/security/server-nonce";

export const metadata: Metadata = {
  ...createPublicMetadata({
    title: { absolute: siteConfig.title },
    description: siteConfig.description,
    path: "/",
    keywords: siteConfig.keywords,
  }),
};

export default async function MarketingHomePage() {
  const nonce = await getCspNonce();

  return (
    <>
      <JsonLdScript nonce={nonce} value={buildHomeJsonLd()} />
      <LandingPage />
    </>
  );
}
