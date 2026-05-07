import type { Metadata } from "next";
import LandingPage from "@/components/landing/landing-page";
import {
  buildHomeJsonLd,
  createPublicMetadata,
  serializeJsonLd,
  siteConfig,
} from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...createPublicMetadata({
    title: { absolute: siteConfig.title },
    description: siteConfig.description,
    path: "/",
    keywords: siteConfig.keywords,
  }),
};

export default function MarketingHomePage() {
  return (
    <>
      <script type="application/ld+json">
        {serializeJsonLd(buildHomeJsonLd())}
      </script>
      <LandingPage />
    </>
  );
}
