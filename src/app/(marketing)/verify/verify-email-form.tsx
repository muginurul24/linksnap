"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
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
import { Toaster } from "@/components/ui/sonner";
import {
  clearFieldError,
  fieldErrorFromParseResult,
  firstFieldErrors,
  type FieldErrors,
} from "@/lib/forms/field-errors";
import {
  verifyEmailSchema,
  type VerifyEmailInput,
} from "@/lib/validations/auth";

type VerifyField = Extract<keyof VerifyEmailInput, string>;

async function readApiError(response: Response): Promise<string> {
  const fallbackByStatus: Record<number, string> = {
    400: "Check the code and try again.",
    429: "Too many attempts. Try again later.",
  };

  try {
    const payload = await response.json();
    if (typeof payload?.error?.message === "string") {
      return payload.error.message;
    }
  } catch {
    // Non-JSON errors fall back to status-specific copy.
  }

  return fallbackByStatus[response.status] ?? "Unable to verify email.";
}

export function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState<FieldErrors<VerifyField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const verifyCode = async (input: VerifyEmailInput) => {
    setIsVerifying(true);
    setFormError(null);

    try {
      const response = await fetch("/api/v1/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        setFormError(await readApiError(response));
        return;
      }

      toast.success("Email verified. You can sign in now.");
      router.push("/login?verified=true");
    } catch {
      setFormError("Unable to reach the verification service.");
    } finally {
      setIsVerifying(false);
    }
  };

  const submitVerification = async (nextOtp = otp) => {
    const parsed = verifyEmailSchema.safeParse({ email, otp: nextOtp });
    if (!parsed.success) {
      setErrors(firstFieldErrors(parsed.error.flatten().fieldErrors));
      return;
    }

    setErrors({});
    await verifyCode(parsed.data);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitVerification();
  };

  const handleOtpChange = (value: string) => {
    const nextOtp = value.replace(/\D/g, "").slice(0, 6);
    setOtp(nextOtp);
    setErrors((current) => clearFieldError(current, "otp"));
    setFormError(null);

    if (nextOtp.length === 6) {
      void submitVerification(nextOtp);
    }
  };

  const validateField = (field: VerifyField) => {
    const message = fieldErrorFromParseResult(
      verifyEmailSchema.safeParse({ email, otp }),
      field,
    );
    setErrors((current) => ({ ...current, [field]: message }));
  };

  const resendOtp = async () => {
    const parsedEmail = verifyEmailSchema.shape.email.safeParse(email);
    if (!parsedEmail.success) {
      setErrors({ email: parsedEmail.error.issues[0]?.message });
      return;
    }

    setIsResending(true);
    setFormError(null);

    try {
      const response = await fetch("/api/v1/auth/resend-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ email: parsedEmail.data }),
      });

      if (!response.ok) {
        setFormError(await readApiError(response));
        return;
      }

      setResendCooldown(60);
      toast.success("A new verification code was sent.");
    } catch {
      setFormError("Unable to resend the verification code.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Verify email</CardTitle>
          <CardDescription>Enter the 6-digit code sent to your inbox.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setErrors((current) => clearFieldError(current, "email"));
                  setFormError(null);
                }}
                onBlur={() => validateField("email")}
                aria-invalid={Boolean(errors.email)}
                disabled={isVerifying}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="otp">Verification code</Label>
              <Input
                id="otp"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                value={otp}
                onChange={(event) => handleOtpChange(event.target.value)}
                onBlur={() => validateField("otp")}
                aria-invalid={Boolean(errors.otp)}
                className="text-center font-mono text-lg tracking-[0.35em]"
                disabled={isVerifying}
              />
              {errors.otp && (
                <p className="text-xs text-destructive">{errors.otp}</p>
              )}
            </div>

            {formError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </div>
            )}

            <Button
              aria-busy={isVerifying}
              className="w-full"
              type="submit"
              disabled={isVerifying}
            >
              {isVerifying && <Loader2 className="size-4 animate-spin" />}
              Verify email
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
            <Link className="text-muted-foreground hover:text-foreground" href="/register">
              Change email
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-busy={isResending}
              onClick={() => void resendOtp()}
              disabled={isResending || resendCooldown > 0}
            >
              {isResending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RotateCcw className="size-4" />
              )}
              {resendCooldown > 0 ? `${resendCooldown}s` : "Resend"}
            </Button>
          </div>
        </CardContent>
      </Card>
      <Toaster richColors closeButton position="top-right" theme="dark" />
    </main>
  );
}
