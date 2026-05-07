import type { Metadata } from "next";
import PricingPage from "@/components/landing/pricing-page";
import {
  buildPricingJsonLd,
  createPublicMetadata,
  serializeJsonLd,
} from "@/lib/seo/metadata";

const description =
  "Compare LinkSnap Free, Pro, and Business plans for short links, Link Pages, Smart Rules, QR codes, analytics, API access, and campaign workflows.";

export const metadata: Metadata = {
  ...createPublicMetadata({
    title: "Pricing",
    description,
    path: "/pricing",
  }),
};

export default function PricingRoute() {
  return (
    <>
      <script type="application/ld+json">
        {serializeJsonLd(buildPricingJsonLd())}
      </script>
      <PricingPage />
    </>
  );
}
