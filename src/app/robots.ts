import type { MetadataRoute } from "next";
import { absoluteUrl, siteConfig } from "@/lib/seo/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api",
        "/dashboard",
        "/links",
        "/pages",
        "/qr",
        "/campaigns",
        "/analytics",
        "/settings",
        "/login",
        "/register",
        "/verify",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteConfig.url,
  };
}
