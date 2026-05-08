import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { auth } from "@/lib/auth";
import { ForgotPasswordForm } from "@/app/(marketing)/forgot-password/forgot-password-form";

const description =
  "Request a secure LinkSnap password reset link by email.";

export const metadata: Metadata = {
  ...createPublicMetadata({
    title: "Reset password",
    description,
    path: "/forgot-password",
    noIndex: true,
  }),
};

export default async function ForgotPasswordPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return <ForgotPasswordForm />;
}
