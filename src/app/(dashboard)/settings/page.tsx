import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Bell, Shield, Key } from "lucide-react";
import { auth } from "@/lib/auth";
import {
  listApiKeysByUserId,
  type ApiKeyListItem,
} from "@/lib/db/queries/api-keys";
import { findBillingUserById } from "@/lib/db/queries/payments";
import { findSettingsUserById } from "@/lib/db/queries/settings";
import type { UserPlan } from "@/lib/links/limits";
import {
  ApiKeysPanel,
  type ApiKeyPanelItem,
} from "@/app/(dashboard)/settings/api-keys-panel";
import {
  NotificationsSettingsForm,
  ProfileSettingsForm,
  SecuritySettingsForm,
} from "@/app/(dashboard)/settings/settings-forms";

type SessionWithUserId = {
  user?: {
    id?: unknown;
  } | null;
} | null;

type SettingsPageProps = {
  searchParams: Promise<{
    tab?: string | string[];
  }>;
};

const SETTINGS_TABS = new Set(["api", "notifications", "profile", "security"]);

function getSessionUserId(session: SessionWithUserId): string | null {
  return typeof session?.user?.id === "string" ? session.user.id : null;
}

function getDefaultSettingsTab(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  const tab = raw?.trim();

  return tab && SETTINGS_TABS.has(tab) ? tab : "profile";
}

function toApiKeyPanelItem(apiKey: ApiKeyListItem): ApiKeyPanelItem {
  return {
    createdAt: apiKey.createdAt.toISOString(),
    id: apiKey.id,
    keyPrefix: apiKey.keyPrefix,
    lastUsedAt: apiKey.lastUsedAt?.toISOString() ?? null,
    name: apiKey.name,
  };
}

function canManageApiKeys(plan: UserPlan): boolean {
  return plan === "PRO" || plan === "BUSINESS";
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const session = await auth();
  const userId = getSessionUserId(session);

  if (!userId) {
    redirect("/login?callbackUrl=/settings");
  }

  const params = await searchParams;
  const defaultTab = getDefaultSettingsTab(params.tab);
  const [billingUser, settingsUser] = await Promise.all([
    findBillingUserById(userId),
    findSettingsUserById(userId),
  ]);

  if (!settingsUser) {
    redirect("/login?callbackUrl=/settings");
  }

  const plan = billingUser?.plan ?? "FREE";
  const apiKeys = canManageApiKeys(plan)
    ? await listApiKeysByUserId(userId)
    : [];

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences.</p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList>
          <TabsTrigger value="profile"><User className="mr-2 size-4" /> Profile</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="mr-2 size-4" /> Notifications</TabsTrigger>
          <TabsTrigger value="security"><Shield className="mr-2 size-4" /> Security</TabsTrigger>
          <TabsTrigger value="api"><Key className="mr-2 size-4" /> API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile Information</CardTitle>
              <CardDescription>Update your name and email address.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileSettingsForm
                email={settingsUser.email}
                initialName={settingsUser.name ?? ""}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification Preferences</CardTitle>
              <CardDescription>Choose what notifications you want to receive.</CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationsSettingsForm
                initialPreferences={settingsUser.notifications}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Change Password</CardTitle>
              <CardDescription>Use a strong password with at least 8 characters.</CardDescription>
            </CardHeader>
            <CardContent>
              <SecuritySettingsForm />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security to your account.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Authenticator App</p>
                  <p className="text-xs text-muted-foreground">Use Google Authenticator or similar.</p>
                </div>
                <Button variant="outline" size="sm">Enable 2FA</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">API Keys</CardTitle>
              <CardDescription>Manage your API keys for programmatic access.</CardDescription>
            </CardHeader>
            <CardContent>
              <ApiKeysPanel
                initialApiKeys={apiKeys.map((apiKey) => toApiKeyPanelItem(apiKey))}
                plan={plan}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
