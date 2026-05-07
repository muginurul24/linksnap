import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { auth } from "@/lib/auth";
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

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return <RegisterForm />;
}
