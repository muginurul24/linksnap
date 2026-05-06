import { Suspense } from "react";
import { LoginForm } from "./login-form";

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
