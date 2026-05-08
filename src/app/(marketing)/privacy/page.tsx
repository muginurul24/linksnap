import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/landing/legal-page";
import { createPublicMetadata } from "@/lib/seo/metadata";

const description =
  "How LinkSnap collects, uses, protects, and shares account, link, analytics, billing, and support information.";

const sections: LegalSection[] = [
  {
    title: "1. Information we collect",
    paragraphs: [
      "We collect account information such as email address, name, authentication state, and plan details. We also store link data you create, including destination URLs, slugs, campaigns, Link Page content, QR settings, and smart redirect rules.",
      "When someone opens a short link, we collect analytics needed to provide reporting and abuse protection, such as timestamp, referrer, user agent, device category, country, and a hashed IP-derived identifier. We do not store raw payment card data.",
    ],
  },
  {
    title: "2. How we use information",
    paragraphs: [
      "We use information to operate short links, render Link Pages, generate QR codes, process login and email verification, provide analytics, enforce plan limits, process subscriptions, prevent abuse, and improve service reliability.",
      "We may use aggregated or de-identified metrics to understand product usage and performance.",
    ],
  },
  {
    title: "3. Sharing and processors",
    paragraphs: [
      "We share information with service providers only as needed to operate LinkSnap. Current provider categories include hosting, database, Redis cache, authentication, email delivery, payment processing, analytics infrastructure, and observability.",
      "Payment checkout is handled by PayGate. Email delivery is handled by Resend. Database and cache infrastructure are handled by managed providers such as Neon and Upstash.",
    ],
  },
  {
    title: "4. Cookies and sessions",
    paragraphs: [
      "LinkSnap uses cookies and similar storage for authentication, security, session continuity, and preference handling. Some cookies are required for dashboard access and payment workflows.",
    ],
  },
  {
    title: "5. Retention",
    paragraphs: [
      "We keep account, billing, link, and analytics data while your account is active or as needed to provide the service, comply with legal obligations, resolve disputes, enforce agreements, and maintain security records.",
      "Some data may remain in backups or logs for a limited period before deletion through normal retention cycles.",
    ],
  },
  {
    title: "6. Security",
    paragraphs: [
      "We use security controls such as password hashing, HTTPS, rate limiting, provider-managed encryption, webhook signature checks, and restricted access patterns. No online service can guarantee absolute security.",
    ],
  },
  {
    title: "7. Your choices",
    paragraphs: [
      "You can update profile settings in the dashboard, delete links you no longer need, and contact us to request account or data assistance.",
      "Depending on your location, you may have rights to access, correct, delete, export, or object to certain processing of personal information.",
    ],
  },
  {
    title: "8. Children, changes, and contact",
    paragraphs: [
      "LinkSnap is not intended for children under 13, and we do not knowingly collect personal information from children.",
      "We may update this Privacy Policy when our practices or providers change. Questions or requests can be sent to support@justqiu.cloud.",
    ],
  },
];

export const metadata: Metadata = {
  ...createPublicMetadata({
    title: "Privacy Policy",
    description,
    path: "/privacy",
  }),
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description={description}
      updatedAt="May 7, 2026"
      sections={sections}
    />
  );
}
