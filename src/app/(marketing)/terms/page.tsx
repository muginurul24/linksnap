import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/landing/legal-page";
import { createPublicMetadata } from "@/lib/seo/metadata";

const description =
  "Terms that govern access to LinkSnap short links, Link Pages, QR codes, analytics, API access, and paid subscriptions.";

const sections: LegalSection[] = [
  {
    title: "1. Using LinkSnap",
    paragraphs: [
      "These Terms govern your access to LinkSnap. By creating an account, using a short link, or purchasing a paid plan, you agree to use the service only for lawful business or personal workflows.",
      "You are responsible for keeping your account credentials secure and for activity that occurs under your account.",
    ],
  },
  {
    title: "2. Accounts and content",
    paragraphs: [
      "You own the destination URLs, campaign names, Link Page copy, QR usage, and other content you submit to LinkSnap. You grant LinkSnap permission to process and display that content only as needed to provide the service.",
      "You must not use LinkSnap for phishing, malware, deceptive redirects, spam, unlawful content, harassment, or activity that infringes another party's rights.",
    ],
  },
  {
    title: "3. Plans, payments, and billing",
    paragraphs: [
      "Free and paid plan limits are shown in the product and may change as the service evolves. Paid checkout is processed by Midtrans; LinkSnap does not store payment card data.",
      "A paid plan starts when the payment provider confirms settlement through the server-side webhook. If a payment is pending, the account may remain on the previous plan until confirmation is received.",
    ],
  },
  {
    title: "4. Service availability",
    paragraphs: [
      "LinkSnap is provided on an as-available basis. We work to keep redirects, analytics, billing, and dashboard features reliable, but we do not guarantee uninterrupted access or error-free operation.",
      "We may suspend or limit access when needed to protect users, enforce these Terms, comply with law, or prevent abuse of infrastructure.",
    ],
  },
  {
    title: "5. Third-party services",
    paragraphs: [
      "LinkSnap depends on providers such as hosting, database, Redis, email, OAuth, and payment processors. Their services may have separate terms and availability limits.",
      "Destination websites and third-party content reached through short links are controlled by their owners, not LinkSnap.",
    ],
  },
  {
    title: "6. Limitation of liability",
    paragraphs: [
      "To the maximum extent permitted by law, LinkSnap is not liable for indirect, incidental, special, consequential, or lost-profit damages arising from use of the service.",
      "Nothing in these Terms limits rights or obligations that cannot be limited under applicable law.",
    ],
  },
  {
    title: "7. Changes and contact",
    paragraphs: [
      "We may update these Terms as the service changes. Continued use after an update means you accept the revised Terms.",
      "Questions about these Terms can be sent to support@justqiu.cloud.",
    ],
  },
];

export const metadata: Metadata = {
  ...createPublicMetadata({
    title: "Terms of Service",
    description,
    path: "/terms",
  }),
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      description={description}
      updatedAt="May 7, 2026"
      sections={sections}
    />
  );
}
