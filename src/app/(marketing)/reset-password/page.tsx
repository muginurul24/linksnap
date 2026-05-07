import type { Metadata } from "next";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { ResetPasswordForm } from "./reset-password-form";

const description = "Choose a new password for your LinkSnap account.";

export const metadata: Metadata = {
  ...createPublicMetadata({
    title: "Choose new password",
    description,
    path: "/reset-password",
    noIndex: true,
  }),
};

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;

  return <ResetPasswordForm initialToken={token ?? ""} />;
}
