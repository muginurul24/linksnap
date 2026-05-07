"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { twoFactorLoginSchema } from "@/lib/validations/auth";

function signInErrorMessage(error: string): string {
  const messages: Record<string, string> = {
    CredentialsSignin: "Verification failed. Check the code and try again.",
  };

  return messages[error] ?? "Unable to verify this sign-in.";
}

export function TwoFactorLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get("challenge") ?? "";
  const callbackUrl = searchParams.get("callbackUrl") ?? "/links";
  const [token, setToken] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = twoFactorLoginSchema.safeParse({
      backupCode: useBackupCode ? backupCode : undefined,
      challengeId,
      token: useBackupCode ? undefined : token,
    });

    if (!parsed.success) {
      setFormError("Enter a valid verification code.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const result = await signIn("credentials", {
        backupCode: parsed.data.backupCode,
        callbackUrl,
        challengeId: parsed.data.challengeId,
        redirect: false,
        totpToken: parsed.data.token,
      });

      if (result?.error) {
        setFormError(signInErrorMessage(result.code ?? result.error));
        return;
      }

      router.push(result?.url ?? callbackUrl);
      router.refresh();
    } catch {
      setFormError("Unable to reach the verification service.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Two-factor verification</CardTitle>
          <CardDescription>Enter the code from your authenticator app.</CardDescription>
        </CardHeader>
        <CardContent>
          {!challengeId ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                This verification link has expired.
              </div>
              <ButtonLink className="w-full" href="/login" variant="outline">
                Return to sign in
              </ButtonLink>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={(event) => void submitVerification(event)}>
              <div className="space-y-1.5">
                <Label htmlFor={useBackupCode ? "backup-code" : "totp-code"}>
                  {useBackupCode ? "Backup code" : "Verification code"}
                </Label>
                <Input
                  autoComplete="one-time-code"
                  disabled={isSubmitting}
                  id={useBackupCode ? "backup-code" : "totp-code"}
                  inputMode={useBackupCode ? "text" : "numeric"}
                  maxLength={useBackupCode ? 16 : 6}
                  onChange={(event) => {
                    if (useBackupCode) setBackupCode(event.target.value);
                    else setToken(event.target.value.replace(/\D/g, "").slice(0, 6));
                    setFormError(null);
                  }}
                  value={useBackupCode ? backupCode : token}
                />
              </div>

              <button
                className="text-xs text-muted-foreground hover:text-foreground"
                disabled={isSubmitting}
                onClick={() => {
                  setUseBackupCode((current) => !current);
                  setFormError(null);
                }}
                type="button"
              >
                {useBackupCode ? "Use authenticator code" : "Use a backup code"}
              </button>

              {formError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </div>
              )}

              <Button
                aria-busy={isSubmitting}
                className="w-full"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <KeyRound className="size-4" />
                )}
                Verify
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
