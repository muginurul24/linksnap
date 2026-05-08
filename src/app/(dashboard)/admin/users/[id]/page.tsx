"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlanOverrideDialog } from "@/components/admin/plan-override-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import type { UserPlan } from "@/lib/links/limits";

type UserDetail = {
  id: string;
  email: string;
  name: string | null;
  plan: UserPlan;
  role: string;
  emailVerified: string | null;
  deletedAt: string | null;
  createdAt: string;
  avatarUrl: string | null;
  twoFactorEnabled: boolean;
  totalClicks: number;
  linkCount: number;
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
};

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);

  const fetchUser = () => {
    fetch(`/api/v1/admin/users/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error?.message || "User not found");
        return res.json();
      })
      .then((data) => setUser(data.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleChangePlan(plan: UserPlan) {
    const res = await fetch(`/api/v1/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    if (!res.ok) throw new Error("Failed to update plan");
    toast.success(`Plan changed to ${plan}`);
    setLoading(true);
    setError(null);
    fetchUser();
  }

  async function handleSuspend(action: "suspend" | "unsuspend") {
    const res = await fetch(`/api/v1/admin/users/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) throw new Error(`Failed to ${action} user`);
    toast.success(`User ${action === "suspend" ? "suspended" : "unsuspended"}`);
    setLoading(true);
    setError(null);
    fetchUser();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 size-4" /> Back
        </Button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error || "User not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.push("/admin/users")}>
        <ArrowLeft className="mr-2 size-4" /> Back to Users
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {user.name || "Unnamed User"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <span className="text-sm text-muted-foreground">ID</span>
              <p className="font-mono text-xs">{user.id}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Role</span>
              <p>
                <Badge variant="outline">{user.role}</Badge>
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Joined</span>
              <p>{new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Email Verified</span>
              <p>
                {user.emailVerified ? (
                  <Badge variant="outline" className="text-emerald-600">
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-destructive">
                    Not Verified
                  </Badge>
                )}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">2FA</span>
              <p>
                {user.twoFactorEnabled ? (
                  <Badge variant="outline" className="text-emerald-600">
                    Enabled
                  </Badge>
                ) : (
                  <Badge variant="outline">Disabled</Badge>
                )}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Status</span>
              <p>
                {user.deletedAt ? (
                  <Badge variant="outline" className="text-destructive">
                    Suspended
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-emerald-600">
                    Active
                  </Badge>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Links</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{user.linkCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{user.totalClicks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {user.subscriptionPlan || "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {user.subscriptionStatus || "No subscription"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan Override</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Current:</span>
              <Badge
                variant={user.plan === "BUSINESS" ? "default" : user.plan === "PRO" ? "secondary" : "outline"}
              >
                {user.plan}
              </Badge>
            </div>
            <Button onClick={() => setPlanDialogOpen(true)}>
              Change Plan
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            {user.deletedAt ? (
              <Button
                variant="outline"
                onClick={() => void handleSuspend("unsuspend").catch(() => toast.error("Failed to unsuspend"))}
              >
                Unsuspend User
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm("Are you sure you want to suspend this user? They will be unable to log in.")) {
                    void handleSuspend("suspend").catch(() => toast.error("Failed to suspend"));
                  }
                }}
              >
                <ShieldAlert className="mr-2 size-4" />
                Suspend User
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <PlanOverrideDialog
        open={planDialogOpen}
        onOpenChange={setPlanDialogOpen}
        currentPlan={user.plan}
        userEmail={user.email}
        onConfirm={handleChangePlan}
      />
    </div>
  );
}
