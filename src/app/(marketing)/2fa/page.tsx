import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { TwoFactorLoginForm } from "./two-factor-login-form";

const description =
  "Complete two-factor verification to access your LinkSnap workspace.";

export const metadata: Metadata = {
  ...createPublicMetadata({
    title: "Two-factor verification",
    description,
    path: "/2fa",
    noIndex: true,
  }),
};

export default async function TwoFactorPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
          <div className="h-64 w-full max-w-sm rounded-xl bg-muted" />
        </main>
      }
    >
      <TwoFactorLoginForm />
    </Suspense>
  );
}
