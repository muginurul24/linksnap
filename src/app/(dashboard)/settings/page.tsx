import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Save, User, Bell, Shield, Key } from "lucide-react";

export default function SettingsPage() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
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
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" defaultValue="Rafi" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="rafi@email.com" />
                </div>
              </div>
              <Button size="sm"><Save className="mr-2 size-4" /> Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification Preferences</CardTitle>
              <CardDescription>Choose what notifications you want to receive.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {["Weekly analytics report", "Payment confirmations", "Link performance alerts", "Product updates & tips"].map((item) => (
                <div key={item} className="flex items-center justify-between">
                  <Label className="text-sm">{item}</Label>
                  <Switch defaultChecked />
                </div>
              ))}
              <Button size="sm" className="mt-2"><Save className="mr-2 size-4" /> Save Preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Change Password</CardTitle>
              <CardDescription>Use a strong password with at least 8 characters.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current">Current Password</Label>
                <Input id="current" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new">New Password</Label>
                <Input id="new" type="password" />
              </div>
              <Button size="sm">Update Password</Button>
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
              <div className="rounded-lg border bg-muted/50 p-6 text-center">
                <Key className="mx-auto mb-3 size-8 text-muted-foreground" />
                <p className="text-sm font-medium">Upgrade to Pro to access API keys</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  API access is available on Pro and Business plans.
                </p>
                <Button size="sm" className="mt-4" variant="outline">Upgrade Plan</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
