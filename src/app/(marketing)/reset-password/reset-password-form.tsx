"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { PasswordStrengthIndicator } from "@/components/auth/password-strength-indicator";
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
  clearFieldError,
  fieldErrorFromParseResult,
  firstFieldErrors,
  type FieldErrors,
} from "@/lib/forms/field-errors";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/validations/auth";

type ResetPasswordField = Extract<keyof ResetPasswordInput, string>;

async function readApiError(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    if (typeof payload?.error?.message === "string") {
      return payload.error.message;
    }
  } catch {
    // Fall back to generic copy for non-JSON errors.
  }

  return "Unable to reset password.";
}

export function ResetPasswordForm({ initialToken }: { initialToken: string }) {
  const [form, setForm] = useState<ResetPasswordInput>({
    token: initialToken,
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FieldErrors<ResetPasswordField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const updateField = (field: ResetPasswordField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => clearFieldError(current, field));
    setFormError(null);
  };

  const validateField = (field: ResetPasswordField) => {
    const message = fieldErrorFromParseResult(
      resetPasswordSchema.safeParse(form),
      field,
    );
    setErrors((current) => ({ ...current, [field]: message }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = resetPasswordSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(firstFieldErrors(parsed.error.flatten().fieldErrors));
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const response = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        setFormError(await readApiError(response));
        return;
      }

      setIsComplete(true);
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
          <CardTitle>Choose new password</CardTitle>
          <CardDescription>
            Set a new password for your LinkSnap account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isComplete ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
                Your password has been updated.
              </div>
              <Link className={buttonVariants({ className: "w-full" })} href="/login">
                Sign in
              </Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <input
                autoComplete="username"
                className="hidden"
                name="username"
                readOnly
                value=""
              />

              {!initialToken && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Reset token is missing. Request a new reset link.
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(event) => updateField("password", event.target.value)}
                  onBlur={() => validateField("password")}
                  aria-invalid={Boolean(errors.password)}
                  disabled={isSubmitting}
                />
                <PasswordStrengthIndicator password={form.password} />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(event) =>
                    updateField("confirmPassword", event.target.value)
                  }
                  onBlur={() => validateField("confirmPassword")}
                  aria-invalid={Boolean(errors.confirmPassword)}
                  disabled={isSubmitting}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {errors.token && (
                <p className="text-xs text-destructive">{errors.token}</p>
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
                disabled={isSubmitting || !initialToken}
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <KeyRound className="size-4" />
                )}
                Update password
              </Button>
            </form>
          )}

          {!isComplete && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Need a new link?{" "}
              <Link
                className="font-medium text-primary hover:underline"
                href="/forgot-password"
              >
                Request reset
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
