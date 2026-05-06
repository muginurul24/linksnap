import type { Metadata } from "next";
import LandingPage from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "LinkSnap — Smart Short Links & Micro Landing Pages",
  description: "Transform every link into a conversion engine. Smart redirects, branded link pages, campaign analytics.",
  keywords: ["url shortener", "link pages", "smart redirect", "qr code", "campaign analytics", "link management"],
  openGraph: {
    type: "website",
    title: "LinkSnap — Smart Short Links & Micro Landing Pages",
    description: "Transform every link into a conversion engine.",
    siteName: "LinkSnap",
  },
};

export default function Home() {
  return <LandingPage />;
}
