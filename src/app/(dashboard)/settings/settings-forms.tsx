"use client";

import { type FormEvent, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { UserNotificationPreferences } from "@/lib/db/schema";

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

const notificationItems: Array<{
  key: keyof UserNotificationPreferences;
  label: string;
}> = [
  { key: "weeklyAnalyticsReport", label: "Weekly analytics report" },
  { key: "paymentConfirmations", label: "Payment confirmations" },
  { key: "linkPerformanceAlerts", label: "Link performance alerts" },
  { key: "productUpdates", label: "Product updates & tips" },
];

async function readResponse<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

export function ProfileSettingsForm({
  email,
  initialName,
}: ProfileSettingsFormProps) {
  const [name, setName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch("/api/v1/settings/profile", {
        body: JSON.stringify({ name }),
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
      toast.success("Profile saved.");
    } catch {
      toast.error("Unable to save profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={(event) => void submitProfile(event)}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            maxLength={255}
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" readOnly type="email" value={email} />
        </div>
      </div>
      <Button disabled={isSaving} size="sm" type="submit">
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
      toast.success("Preferences saved.");
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
            id={`notification-${item.key}`}
            onCheckedChange={(checked) => setPreference(item.key, checked)}
          />
        </div>
      ))}
      <Button
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
  const [isSaving, setIsSaving] = useState(false);

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch("/api/v1/auth/change-password", {
        body: JSON.stringify({ confirmPassword, currentPassword, password }),
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

      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      toast.success("Password updated.");
    } catch {
      toast.error("Unable to update password.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={(event) => void submitPassword(event)}>
      <div className="space-y-2">
        <Label htmlFor="current-password">Current Password</Label>
        <Input
          autoComplete="current-password"
          id="current-password"
          onChange={(event) => setCurrentPassword(event.target.value)}
          type="password"
          value={currentPassword}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-password">New Password</Label>
        <Input
          autoComplete="new-password"
          id="new-password"
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          value={password}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm New Password</Label>
        <Input
          autoComplete="new-password"
          id="confirm-password"
          onChange={(event) => setConfirmPassword(event.target.value)}
          type="password"
          value={confirmPassword}
        />
      </div>
      <Button disabled={isSaving} size="sm" type="submit">
        {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
        Update Password
      </Button>
    </form>
  );
}
