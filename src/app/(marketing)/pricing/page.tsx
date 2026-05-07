import type { Metadata } from "next";
import PricingPage from "@/components/landing/pricing-page";

const title = "Pricing - LinkSnap";
const description =
  "Compare LinkSnap Free, Pro, and Business plans for short links, Link Pages, Smart Rules, QR codes, analytics, API access, and campaign workflows.";

const pricingStructuredData = {
  "@context": "https://schema.org",
  "@type": "OfferCatalog",
  name: "LinkSnap pricing",
  url: "https://linksnap.id/pricing",
  itemListElement: [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    {
      "@type": "Offer",
      name: "Pro",
      price: "8",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    {
      "@type": "Offer",
      name: "Business",
      price: "19",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  ],
};

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    type: "website",
    url: "/pricing",
    title,
    description,
    siteName: "LinkSnap",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "LinkSnap campaign dashboard preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/opengraph-image"],
  },
};

function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default function PricingRoute() {
  return (
    <>
      <script type="application/ld+json">
        {serializeJsonLd(pricingStructuredData)}
      </script>
      <PricingPage />
    </>
  );
}
