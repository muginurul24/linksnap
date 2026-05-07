"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

type LoginErrors = Partial<Record<keyof LoginInput, string>>;

const initialForm: LoginInput = {
  email: "",
  password: "",
};

function firstErrors(
  errors: Partial<Record<keyof LoginInput, string[] | undefined>>,
): LoginErrors {
  return Object.fromEntries(
    Object.entries(errors).map(([field, messages]) => [field, messages?.[0]]),
  ) as LoginErrors;
}

function signInErrorMessage(error: string): string {
  const messages: Record<string, string> = {
    CredentialsSignin: "Invalid email or password.",
    AccessDenied: "Email is not verified.",
    EmailNotVerified: "Email is not verified.",
    email_not_verified: "Email is not verified.",
  };

  return messages[error] ?? "Unable to sign in.";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/links";
  const isVerified = searchParams.get("verified") === "true";
  const initialError = searchParams.get("error");
  const initialCode = searchParams.get("code");
  const [form, setForm] = useState<LoginInput>(initialForm);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [formError, setFormError] = useState<string | null>(
    initialError ? signInErrorMessage(initialCode ?? initialError) : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const updateField = (field: keyof LoginInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(firstErrors(parsed.error.flatten().fieldErrors));
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const result = await signIn("credentials", {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setFormError(signInErrorMessage(result.code ?? result.error));
        return;
      }

      router.push(result?.url ?? callbackUrl);
      router.refresh();
    } catch {
      setFormError("Unable to reach the sign-in service.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    await signIn("google", { callbackUrl });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Continue to your LinkSnap workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          {isVerified && (
            <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
              Email verified. You can sign in now.
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                aria-invalid={Boolean(errors.email)}
                disabled={isSubmitting || isGoogleLoading}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="password">Password</Label>
                <Link
                  className="text-xs text-muted-foreground hover:text-foreground"
                  href="/forgot-password"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                aria-invalid={Boolean(errors.password)}
                disabled={isSubmitting || isGoogleLoading}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            {formError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </div>
            )}

            <Button
              aria-busy={isSubmitting}
              className="w-full"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Sign in
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            className="w-full"
            type="button"
            variant="outline"
            aria-busy={isGoogleLoading}
            onClick={() => void handleGoogleSignIn()}
            disabled={isSubmitting || isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogIn className="size-4" />
            )}
            Sign in with Google
          </Button>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            No account yet?{" "}
            <Link className="font-medium text-primary hover:underline" href="/register">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
