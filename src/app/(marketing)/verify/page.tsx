import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/auth/session-helpers";
import { findUserVerificationStatusById } from "@/lib/db/queries/users";
import { VerifyEmailForm } from "@/app/(marketing)/verify/verify-email-form";

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

export default async function VerifyPage() {
  const session = await auth();
  const userId = getSessionUserId(session);

  if (userId) {
    const user = await findUserVerificationStatusById(userId);
    if (user?.emailVerified) redirect("/dashboard");
  }

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
