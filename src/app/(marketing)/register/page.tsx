import type { Metadata } from "next";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { RegisterForm } from "./register-form";

const description =
  "Create a LinkSnap account to build short links, Link Pages, QR codes, campaign workflows, and analytics.";

export const metadata: Metadata = {
  ...createPublicMetadata({
    title: "Create account",
    description,
    path: "/register",
    noIndex: true,
  }),
};

export default function RegisterPage() {
  return <RegisterForm />;
}
