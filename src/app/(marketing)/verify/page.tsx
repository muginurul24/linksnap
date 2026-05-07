import type { Metadata } from "next";
import { Suspense } from "react";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { VerifyEmailForm } from "./verify-email-form";

const description =
  "Verify your LinkSnap account email before signing in to your workspace.";

export const metadata: Metadata = {
  ...createPublicMetadata({
    title: "Verify email",
    description,
    path: "/verify",
    noIndex: true,
  }),
};

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
          <div className="h-64 w-full max-w-sm rounded-xl bg-muted" />
        </main>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
