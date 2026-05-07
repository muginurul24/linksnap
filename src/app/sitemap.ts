import type { MetadataRoute } from "next";
import {
  absoluteUrl,
  publicSitemapRoutes,
  siteConfig,
} from "@/lib/seo/metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  return publicSitemapRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: siteConfig.updatedAt,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
