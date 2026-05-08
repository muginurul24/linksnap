import type { Metadata } from "next";
import { headers } from "next/headers";
import { CspNonceProvider } from "@/components/security/nonce-provider";
import { CSP_NONCE_HEADER } from "@/lib/security/headers";
import { indexRobots, siteConfig } from "@/lib/seo/metadata";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  referrer: "origin-when-cross-origin",
  robots: indexRobots,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get(CSP_NONCE_HEADER);

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className="dark"
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <CspNonceProvider nonce={nonce}>{children}</CspNonceProvider>
      </body>
    </html>
  );
}
