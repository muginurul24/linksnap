"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Loader2, Mail } from "lucide-react";
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
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validations/auth";

type ForgotPasswordErrors = Partial<Record<keyof ForgotPasswordInput, string>>;

const initialForm: ForgotPasswordInput = {
  email: "",
};

function firstErrors(
  errors: Partial<Record<keyof ForgotPasswordInput, string[] | undefined>>,
): ForgotPasswordErrors {
  return Object.fromEntries(
    Object.entries(errors).map(([field, messages]) => [field, messages?.[0]]),
  ) as ForgotPasswordErrors;
}

async function readApiError(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    if (typeof payload?.error?.message === "string") {
      return payload.error.message;
    }
  } catch {
    // Fall back to generic copy for non-JSON errors.
  }

  return response.status === 429
    ? "Too many reset requests. Try again later."
    : "Unable to request a password reset.";
}

export function ForgotPasswordForm() {
  const [form, setForm] = useState<ForgotPasswordInput>(initialForm);
  const [errors, setErrors] = useState<ForgotPasswordErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const updateEmail = (email: string) => {
    setForm({ email });
    setErrors({});
    setFormError(null);
    setIsSubmitted(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = forgotPasswordSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(firstErrors(parsed.error.flatten().fieldErrors));
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const response = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ email: parsed.data.email }),
      });

      if (!response.ok) {
        setFormError(await readApiError(response));
        return;
      }

      setIsSubmitted(true);
    } catch {
      setFormError("Unable to reach the password reset service.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>
            Enter your account email and we will send a reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) => updateEmail(event.target.value)}
                aria-invalid={Boolean(errors.email)}
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            {isSubmitted && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
                If an account exists, reset instructions have been sent.
              </div>
            )}

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
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Mail className="size-4" />
              )}
              Send reset link
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link className="font-medium text-primary hover:underline" href="/login">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
