import type { Metadata } from "next";
import LandingPage from "@/components/landing/landing-page";

const siteUrl = "https://linksnap.id";
const title = "LinkSnap - Smart Short Links & Micro Landing Pages";
const description =
  "Turn every short link into a branded conversion path with smart redirects, link pages, QR codes, campaign analytics, and Midtrans-ready billing.";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "LinkSnap",
  applicationCategory: "MarketingApplication",
  operatingSystem: "Web",
  url: siteUrl,
  description,
  offers: [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "USD",
    },
    {
      "@type": "Offer",
      name: "Pro",
      price: "8",
      priceCurrency: "USD",
    },
    {
      "@type": "Offer",
      name: "Business",
      price: "19",
      priceCurrency: "USD",
    },
  ],
  publisher: {
    "@type": "Organization",
    name: "LinkSnap",
    url: siteUrl,
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  keywords: [
    "url shortener",
    "link pages",
    "smart redirects",
    "qr code generator",
    "campaign analytics",
    "Midtrans payments",
    "Indonesia marketing tools",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
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

export default function MarketingHomePage() {
  return (
    <>
      <script type="application/ld+json">
        {serializeJsonLd(structuredData)}
      </script>
      <LandingPage />
    </>
  );
}
