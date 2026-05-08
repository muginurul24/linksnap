import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/app/(marketing)/login/login-form";

const description =
  "Sign in to your LinkSnap workspace to manage short links, Link Pages, QR codes, campaigns, and analytics.";

export const metadata: Metadata = {
  ...createPublicMetadata({
    title: "Sign in",
    description,
    path: "/login",
    noIndex: true,
  }),
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
          <div className="h-72 w-full max-w-sm rounded-xl bg-muted" />
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
