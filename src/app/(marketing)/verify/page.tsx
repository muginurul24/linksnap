import { Suspense } from "react";
import { VerifyEmailForm } from "./verify-email-form";

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
