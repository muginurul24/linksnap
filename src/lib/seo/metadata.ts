import type { Metadata } from "next";

type MetadataTitle = string | { absolute: string };

type PublicMetadataInput = {
  title: MetadataTitle;
  description: string;
  path: string;
  keywords?: readonly string[];
  noIndex?: boolean;
};

type BlogStructuredDataPost = {
  slug: string;
  title: string;
  excerpt: string;
};

export const siteConfig = {
  name: "LinkSnap",
  url: "https://linksnap.id",
  title: "LinkSnap - Smart Short Links & Micro Landing Pages",
  description:
    "Turn every short link into a branded conversion path with smart redirects, Link Pages, QR codes, campaign analytics, and Midtrans-ready billing.",
  ogImagePath: "/opengraph-image",
  socialImagePath: "/landing-preview.png",
  updatedAt: new Date("2026-05-07T00:00:00.000Z"),
  keywords: [
    "url shortener",
    "link pages",
    "smart redirects",
    "qr code generator",
    "campaign analytics",
    "Midtrans payments",
    "Indonesia marketing tools",
  ],
} as const;

export const publicSitemapRoutes = [
  {
    path: "/",
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    path: "/pricing",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/blog",
    changeFrequency: "weekly",
    priority: 0.7,
  },
] as const;

export const indexRobots: NonNullable<Metadata["robots"]> = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-video-preview": -1,
    "max-image-preview": "large",
    "max-snippet": -1,
  },
};

export const noIndexRobots: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
  },
};

export function absoluteUrl(path = "/"): string {
  return new URL(path, siteConfig.url).toString();
}

export function createPublicMetadata({
  title,
  description,
  path,
  keywords,
  noIndex = false,
}: PublicMetadataInput): Metadata {
  const resolvedTitle = resolveTitle(title);

  return {
    title,
    description,
    keywords: keywords ? [...keywords] : undefined,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      url: path,
      title: resolvedTitle,
      description,
      siteName: siteConfig.name,
      locale: "en_US",
      images: [
        {
          url: siteConfig.ogImagePath,
          width: 1200,
          height: 630,
          alt: "LinkSnap campaign dashboard preview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description,
      images: [siteConfig.ogImagePath],
    },
    robots: noIndex ? noIndexRobots : indexRobots,
  };
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function buildHomeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [organizationJsonLd(), webApplicationJsonLd()],
  };
}

export function buildPricingJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name: "LinkSnap pricing",
    url: absoluteUrl("/pricing"),
    itemListElement: offersJsonLd(),
  };
}

export function buildBlogIndexJsonLd(posts: BlogStructuredDataPost[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "LinkSnap blog",
    itemListElement: posts.map((post, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${absoluteUrl("/blog")}#${post.slug}`,
      name: post.title,
      description: post.excerpt,
    })),
  };
}

function resolveTitle(title: MetadataTitle): string {
  if (typeof title !== "string") {
    return title.absolute;
  }

  return title === siteConfig.name ? siteConfig.name : `${title} | ${siteConfig.name}`;
}

function organizationJsonLd() {
  return {
    "@type": "Organization",
    "@id": `${siteConfig.url}/#organization`,
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
  };
}

function webApplicationJsonLd() {
  return {
    "@type": "WebApplication",
    "@id": `${siteConfig.url}/#web-application`,
    name: siteConfig.name,
    applicationCategory: "MarketingApplication",
    operatingSystem: "Web",
    url: siteConfig.url,
    image: absoluteUrl(siteConfig.socialImagePath),
    description: siteConfig.description,
    offers: offersJsonLd(),
    publisher: {
      "@id": `${siteConfig.url}/#organization`,
    },
  };
}

function offersJsonLd() {
  return [
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
  ];
}
