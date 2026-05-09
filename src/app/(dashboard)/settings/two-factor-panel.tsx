"use client";

import Image from "next/image";
import { type FormEvent, useRef, useState } from "react";
import { CheckCircle2, Copy, KeyRound, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { finishSingleFlight, tryStartSingleFlight } from "@/lib/actions/single-flight";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ApiEnvelope<T> =
  | {
      data: T;
      success: true;
    }
  | {
      error: {
        message: string;
      };
      success: false;
    };

type TwoFactorSetupData = {
  otpauthUrl: string;
  qrCodeDataUrl: string;
  secret: string;
};

type BackupCodesData = {
  backupCodes: string[];
};

type TwoFactorSettingsPanelProps = {
  initialEnabled: boolean;
};

async function readResponse<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

async function postJson<T>(url: string, body?: unknown): Promise<ApiEnvelope<T>> {
  const response = await fetch(url, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    method: "POST",
  });

  return readResponse<T>(response);
}

export function TwoFactorSettingsPanel({
  initialEnabled,
}: TwoFactorSettingsPanelProps) {
  const disableGuard = useRef(false);
  const regenerateGuard = useRef(false);
  const setupGuard = useRef(false);
  const verifyGuard = useRef(false);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupData, setSetupData] = useState<TwoFactorSetupData | null>(null);
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isStartingSetup, setIsStartingSetup] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  async function startSetup() {
    if (!tryStartSingleFlight(setupGuard)) return;

    setIsStartingSetup(true);
    setBackupCodes([]);

    try {
      const body = await postJson<TwoFactorSetupData>("/api/v1/auth/2fa/setup");
      if (!body.success) {
        toast.error(body.error.message);
        return;
      }

      setSetupData(body.data);
      setSetupOpen(true);
    } catch {
      toast.error("Unable to start two-factor setup.");
    } finally {
      finishSingleFlight(setupGuard);
      setIsStartingSetup(false);
    }
  }

  async function verifySetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tryStartSingleFlight(verifyGuard)) return;

    setIsVerifying(true);

    try {
      const body = await postJson<BackupCodesData>("/api/v1/auth/2fa/verify", {
        token,
      });
      if (!body.success) {
        toast.error(body.error.message);
        return;
      }

      setBackupCodes(body.data.backupCodes);
      setEnabled(true);
      setSetupOpen(false);
      setToken("");
      toast.success("Two-factor authentication enabled");
    } catch {
      toast.error("Unable to verify two-factor setup.");
    } finally {
      finishSingleFlight(verifyGuard);
      setIsVerifying(false);
    }
  }

  async function disableTwoFactor() {
    if (!tryStartSingleFlight(disableGuard)) return;

    setIsDisabling(true);

    try {
      const body = await postJson<undefined>("/api/v1/auth/2fa/disable", {
        password,
      });
      if (!body.success) {
        toast.error(body.error.message);
        return;
      }

      setEnabled(false);
      setBackupCodes([]);
      setPassword("");
      toast.success("Two-factor authentication disabled");
    } catch {
      toast.error("Unable to disable two-factor authentication.");
    } finally {
      finishSingleFlight(disableGuard);
      setIsDisabling(false);
    }
  }

  async function regenerateBackupCodes() {
    if (!tryStartSingleFlight(regenerateGuard)) return;

    setIsRegenerating(true);

    try {
      const body = await postJson<BackupCodesData>(
        "/api/v1/auth/2fa/backup-codes",
        { password },
      );
      if (!body.success) {
        toast.error(body.error.message);
        return;
      }

      setBackupCodes(body.data.backupCodes);
      setPassword("");
      toast.success("Backup codes regenerated");
    } catch {
      toast.error("Unable to regenerate backup codes.");
    } finally {
      finishSingleFlight(regenerateGuard);
      setIsRegenerating(false);
    }
  }

  async function copyBackupCodes() {
    await navigator.clipboard.writeText(backupCodes.join("\n"));
    toast.success("Backup codes copied");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Authenticator App</p>
            {enabled ? (
              <Badge className="gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="size-3" />
                2FA Active
              </Badge>
            ) : (
              <Badge variant="outline">Disabled</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Use a time-based code from Google Authenticator, 1Password, or similar.
          </p>
        </div>

        {!enabled ? (
          <Button
            aria-busy={isStartingSetup}
            disabled={isStartingSetup}
            onClick={() => void startSetup()}
            size="sm"
            type="button"
          >
            {isStartingSetup ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShieldCheck className="size-4" />
            )}
            Enable 2FA
          </Button>
        ) : null}
      </div>

      {enabled ? (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
          <div className="space-y-2">
            <Label htmlFor="two-factor-password">Confirm password</Label>
            <Input
              autoComplete="current-password"
              id="two-factor-password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              aria-busy={isDisabling}
              disabled={!password || isDisabling || isRegenerating}
              onClick={() => void disableTwoFactor()}
              size="sm"
              type="button"
              variant="outline"
            >
              {isDisabling ? <Loader2 className="size-4 animate-spin" /> : null}
              Disable 2FA
            </Button>
            <Button
              aria-busy={isRegenerating}
              disabled={!password || isDisabling || isRegenerating}
              onClick={() => void regenerateBackupCodes()}
              size="sm"
              type="button"
              variant="outline"
            >
              {isRegenerating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Regenerate codes
            </Button>
          </div>
        </div>
      ) : null}

      {backupCodes.length > 0 ? (
        <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Backup codes</p>
            <Button
              onClick={() => void copyBackupCodes()}
              size="sm"
              type="button"
              variant="outline"
            >
              <Copy className="size-4" />
              Copy
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {backupCodes.map((code) => (
              <code key={code} className="rounded bg-background px-2 py-1">
                {code}
              </code>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Save these now. They are shown once and older backup codes are no longer valid.
          </p>
        </div>
      ) : null}

      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable two-factor authentication</DialogTitle>
            <DialogDescription>
              Scan this QR code, then enter the 6-digit code from your app.
            </DialogDescription>
          </DialogHeader>

          {setupData ? (
            <form className="space-y-4" onSubmit={(event) => void verifySetup(event)}>
              <div className="flex justify-center">
                <Image
                  alt="Two-factor setup QR code"
                  className="size-[220px] rounded-lg border bg-white p-2"
                  height={220}
                  src={setupData.qrCodeDataUrl}
                  unoptimized
                  width={220}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="two-factor-secret">Manual setup key</Label>
                <Input
                  id="two-factor-secret"
                  readOnly
                  value={setupData.secret}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="two-factor-token">Verification code</Label>
                <Input
                  autoComplete="one-time-code"
                  id="two-factor-token"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) =>
                    setToken(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  value={token}
                />
              </div>
              <DialogFooter>
                <Button
                  aria-busy={isVerifying}
                  disabled={token.length !== 6 || isVerifying}
                  type="submit"
                >
                  {isVerifying ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <KeyRound className="size-4" />
                  )}
                  Verify and enable
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
