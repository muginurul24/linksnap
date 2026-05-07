import type { Metadata } from "next";
import { Suspense } from "react";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { LoginForm } from "./login-form";

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

export default function LoginPage() {
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
