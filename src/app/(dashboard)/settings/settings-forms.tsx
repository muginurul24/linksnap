"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { PasswordStrengthIndicator } from "@/components/auth/password-strength-indicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { UserNotificationPreferences } from "@/lib/db/schema";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/lib/validations/auth";
import {
  clearFieldError,
  fieldErrorFromParseResult,
  firstFieldErrors,
  type FieldErrors,
} from "@/lib/forms/field-errors";
import { settingsProfileSchema } from "@/lib/validations/settings";

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

type ProfileSettingsFormProps = {
  email: string;
  initialName: string;
};

type NotificationsSettingsFormProps = {
  initialPreferences: UserNotificationPreferences;
};

type ProfileField = "name";
type SecurityField = Extract<keyof ChangePasswordInput, string>;

const notificationItems: Array<{
  key: keyof UserNotificationPreferences;
  label: string;
}> = [
  { key: "weeklyAnalyticsReport", label: "Weekly analytics report" },
  { key: "paymentConfirmations", label: "Payment confirmations" },
  { key: "linkPerformanceAlerts", label: "Link performance alerts" },
  { key: "productUpdates", label: "Product updates & tips" },
];

export const settingsSuccessMessages = {
  notifications: "Preferences saved",
  password: "Password changed",
  profile: "Profile updated",
} as const;

export const PASSWORD_SUCCESS_CLEAR_DELAY_MS = 2500;

export const passwordChangeSuccessDetails = {
  description: "Your password was changed successfully.",
  signOutOtherDevicesLabel: "Sign out other devices",
} as const;

export function getPasswordInputType(isVisible: boolean): "password" | "text" {
  return isVisible ? "text" : "password";
}

async function readResponse<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

export function ProfileSettingsForm({
  email,
  initialName,
}: ProfileSettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [errors, setErrors] = useState<FieldErrors<ProfileField>>({});
  const [isSaving, setIsSaving] = useState(false);

  function updateName(value: string) {
    setName(value);
    setErrors((current) => clearFieldError(current, "name"));
  }

  function validateName() {
    const message = fieldErrorFromParseResult(
      settingsProfileSchema.safeParse({ name }),
      "name",
    );
    setErrors((current) => ({ ...current, name: message }));
  }

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = settingsProfileSchema.safeParse({ name });
    if (!parsed.success) {
      setErrors(firstFieldErrors(parsed.error.flatten().fieldErrors));
      return;
    }

    setErrors({});
    setIsSaving(true);

    try {
      const response = await fetch("/api/v1/settings/profile", {
        body: JSON.stringify(parsed.data),
        headers: {
          "content-type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        method: "PATCH",
      });
      const body = await readResponse<{ email: string; name: string | null }>(
        response,
      );

      if (!body.success) {
        toast.error(body.error.message);
        return;
      }

      setName(body.data.name ?? "");
      toast.success(settingsSuccessMessages.profile);
      router.refresh();
    } catch {
      toast.error("Unable to save profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(event) => void submitProfile(event)}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            disabled={isSaving}
            id="name"
            maxLength={255}
            onBlur={validateName}
            onChange={(event) => updateName(event.target.value)}
            aria-invalid={Boolean(errors.name)}
            value={name}
          />
          {errors.name ? (
            <p className="text-xs text-destructive">{errors.name}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input disabled={isSaving} id="email" readOnly type="email" value={email} />
        </div>
      </div>
      <Button aria-busy={isSaving} disabled={isSaving} size="sm" type="submit">
        {isSaving ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" />
        )}
        Save Changes
      </Button>
    </form>
  );
}

export function NotificationsSettingsForm({
  initialPreferences,
}: NotificationsSettingsFormProps) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [isSaving, setIsSaving] = useState(false);

  function setPreference(
    key: keyof UserNotificationPreferences,
    checked: boolean,
  ) {
    setPreferences((current) => ({
      ...current,
      [key]: checked,
    }));
  }

  async function savePreferences() {
    setIsSaving(true);

    try {
      const response = await fetch("/api/v1/settings/notifications", {
        body: JSON.stringify(preferences),
        headers: {
          "content-type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        method: "PATCH",
      });
      const body = await readResponse<{
        notifications: UserNotificationPreferences;
      }>(response);

      if (!body.success) {
        toast.error(body.error.message);
        return;
      }

      setPreferences(body.data.notifications);
      toast.success(settingsSuccessMessages.notifications);
    } catch {
      toast.error("Unable to save preferences.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {notificationItems.map((item) => (
        <div key={item.key} className="flex items-center justify-between">
          <Label className="text-sm" htmlFor={`notification-${item.key}`}>
            {item.label}
          </Label>
          <Switch
            checked={preferences[item.key]}
            disabled={isSaving}
            id={`notification-${item.key}`}
            onCheckedChange={(checked) => setPreference(item.key, checked)}
          />
        </div>
      ))}
      <Button
        aria-busy={isSaving}
        className="mt-2"
        disabled={isSaving}
        onClick={() => void savePreferences()}
        size="sm"
        type="button"
      >
        {isSaving ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" />
        )}
        Save Preferences
      </Button>
    </div>
  );
}

export function SecuritySettingsForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visibleFields, setVisibleFields] = useState<Record<SecurityField, boolean>>({
    confirmPassword: false,
    currentPassword: false,
    password: false,
  });
  const [errors, setErrors] = useState<FieldErrors<SecurityField>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [otherDevicesSignedOut, setOtherDevicesSignedOut] = useState(false);
  const clearTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (clearTimeoutRef.current) window.clearTimeout(clearTimeoutRef.current);
    };
  }, []);

  const formValue: ChangePasswordInput = {
    confirmPassword,
    currentPassword,
    password,
  };

  function updateField(field: SecurityField, value: string) {
    if (field === "currentPassword") setCurrentPassword(value);
    if (field === "password") setPassword(value);
    if (field === "confirmPassword") setConfirmPassword(value);
    setErrors((current) => clearFieldError(current, field));
    setShowSuccess(false);
  }

  function validateField(field: SecurityField) {
    const nextValue = {
      confirmPassword,
      currentPassword,
      password,
    };
    const message = fieldErrorFromParseResult(
      changePasswordSchema.safeParse(nextValue),
      field,
    );
    setErrors((current) => ({ ...current, [field]: message }));
  }

  function togglePasswordVisibility(field: SecurityField) {
    setVisibleFields((current) => ({
      ...current,
      [field]: !current[field],
    }));
  }

  function acknowledgeOtherDevicesSignedOut() {
    setOtherDevicesSignedOut(true);
    toast.success("Other devices will need to sign in again.");
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = changePasswordSchema.safeParse(formValue);
    if (!parsed.success) {
      setErrors(firstFieldErrors(parsed.error.flatten().fieldErrors));
      return;
    }

    setErrors({});
    setIsSaving(true);

    try {
      const response = await fetch("/api/v1/auth/change-password", {
        body: JSON.stringify(parsed.data),
        headers: {
          "content-type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        method: "POST",
      });
      const body = await readResponse<undefined>(response);

      if (!body.success) {
        toast.error(body.error.message);
        return;
      }

      setShowSuccess(true);
      setOtherDevicesSignedOut(false);
      toast.success(settingsSuccessMessages.password);
      if (clearTimeoutRef.current) window.clearTimeout(clearTimeoutRef.current);
      clearTimeoutRef.current = window.setTimeout(() => {
        setCurrentPassword("");
        setPassword("");
        setConfirmPassword("");
        clearTimeoutRef.current = null;
      }, PASSWORD_SUCCESS_CLEAR_DELAY_MS);
    } catch {
      toast.error("Unable to update password.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(event) => void submitPassword(event)}
    >
      <div className="space-y-2">
        <Label htmlFor="current-password">Current Password</Label>
        <div className="relative">
          <Input
            autoComplete="current-password"
            className="pr-10"
            disabled={isSaving}
            id="current-password"
            onBlur={() => validateField("currentPassword")}
            onChange={(event) =>
              updateField("currentPassword", event.target.value)
            }
            aria-invalid={Boolean(errors.currentPassword)}
            type={getPasswordInputType(visibleFields.currentPassword)}
            value={currentPassword}
          />
          <Button
            aria-label={
              visibleFields.currentPassword
                ? "Hide current password"
                : "Show current password"
            }
            className="absolute right-1 top-1/2 -translate-y-1/2"
            disabled={isSaving}
            onClick={() => togglePasswordVisibility("currentPassword")}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            {visibleFields.currentPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </Button>
        </div>
        {errors.currentPassword ? (
          <p className="text-xs text-destructive">{errors.currentPassword}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-password">New Password</Label>
        <div className="relative">
          <Input
            autoComplete="new-password"
            className="pr-10"
            disabled={isSaving}
            id="new-password"
            onBlur={() => validateField("password")}
            onChange={(event) => updateField("password", event.target.value)}
            aria-invalid={Boolean(errors.password)}
            type={getPasswordInputType(visibleFields.password)}
            value={password}
          />
          <Button
            aria-label={
              visibleFields.password ? "Hide new password" : "Show new password"
            }
            className="absolute right-1 top-1/2 -translate-y-1/2"
            disabled={isSaving}
            onClick={() => togglePasswordVisibility("password")}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            {visibleFields.password ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </Button>
        </div>
        <PasswordStrengthIndicator password={password} />
        {errors.password ? (
          <p className="text-xs text-destructive">{errors.password}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm New Password</Label>
        <div className="relative">
          <Input
            autoComplete="new-password"
            className="pr-10"
            disabled={isSaving}
            id="confirm-password"
            onBlur={() => validateField("confirmPassword")}
            onChange={(event) =>
              updateField("confirmPassword", event.target.value)
            }
            aria-invalid={Boolean(errors.confirmPassword)}
            type={getPasswordInputType(visibleFields.confirmPassword)}
            value={confirmPassword}
          />
          <Button
            aria-label={
              visibleFields.confirmPassword
                ? "Hide confirmation password"
                : "Show confirmation password"
            }
            className="absolute right-1 top-1/2 -translate-y-1/2"
            disabled={isSaving}
            onClick={() => togglePasswordVisibility("confirmPassword")}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            {visibleFields.confirmPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </Button>
        </div>
        {errors.confirmPassword ? (
          <p className="text-xs text-destructive">{errors.confirmPassword}</p>
        ) : null}
      </div>
      {showSuccess ? (
        <div
          className="space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm"
          role="status"
        >
          <p className="font-medium text-emerald-700 dark:text-emerald-300">
            {settingsSuccessMessages.password}
          </p>
          <p className="text-muted-foreground">
            {passwordChangeSuccessDetails.description}
          </p>
          <Button
            disabled={otherDevicesSignedOut}
            onClick={acknowledgeOtherDevicesSignedOut}
            size="sm"
            type="button"
            variant="outline"
          >
            {otherDevicesSignedOut
              ? "Other devices signed out"
              : passwordChangeSuccessDetails.signOutOtherDevicesLabel}
          </Button>
        </div>
      ) : null}
      <Button aria-busy={isSaving} disabled={isSaving} size="sm" type="submit">
        {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
        Update Password
      </Button>
    </form>
  );
}
