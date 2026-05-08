"use client";

import { useCallback, useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlanOverrideDialog } from "@/components/admin/plan-override-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorNotice } from "@/components/dashboard/api-error-notice";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch, getFriendlyApiErrorMessage } from "@/lib/api/client";
import { ArrowLeft, Loader2, ShieldAlert } from "lucide-react";
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
  const [error, setError] = useState<unknown | null>(null);
  const [actionError, setActionError] = useState<unknown | null>(null);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [pendingSuspendAction, setPendingSuspendAction] = useState<
    "suspend" | "unsuspend" | null
  >(null);

  const fetchUser = useCallback(
    async ({
      preserveCurrent = false,
      showSkeleton = false,
    }: {
      preserveCurrent?: boolean;
      showSkeleton?: boolean;
    } = {}) => {
      if (showSkeleton) setLoading(true);

      try {
        const data = await apiFetch<UserDetail>(`/api/v1/admin/users/${id}`);
        setUser(data);
        setError(null);
      } catch (err) {
        if (preserveCurrent) {
          setActionError(err);
        } else {
          setUser(null);
          setError(err);
        }
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const data = await apiFetch<UserDetail>(`/api/v1/admin/users/${id}`);
        if (cancelled) return;
        setUser(data);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setUser(null);
        setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleChangePlan(plan: UserPlan) {
    setActionError(null);

    try {
      await apiFetch(`/api/v1/admin/users/${id}`, {
        body: JSON.stringify({ plan }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      toast.success(`Plan changed to ${plan}`);
      await fetchUser({ preserveCurrent: true });
    } catch (err) {
      setActionError(err);
      toast.error(getFriendlyApiErrorMessage(err));
      throw err;
    }
  }

  async function handleSuspend(action: "suspend" | "unsuspend") {
    setActionError(null);
    setPendingSuspendAction(action);

    try {
      await apiFetch(`/api/v1/admin/users/${id}`, {
        body: JSON.stringify({ action }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      toast.success(`User ${action === "suspend" ? "suspended" : "unsuspended"}`);
      setSuspendDialogOpen(false);
      await fetchUser({ preserveCurrent: true });
    } catch (err) {
      setActionError(err);
      toast.error(getFriendlyApiErrorMessage(err));
    } finally {
      setPendingSuspendAction(null);
    }
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
        <ApiErrorNotice
          error={error ?? new Error("User not found")}
          onRetry={() => void fetchUser({ showSkeleton: true })}
          title="User could not be loaded"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.push("/admin/users")}>
        <ArrowLeft className="mr-2 size-4" /> Back to Users
      </Button>

      {actionError && !planDialogOpen && !suspendDialogOpen ? (
        <ApiErrorNotice error={actionError} title="Admin action failed" />
      ) : null}

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
                disabled={pendingSuspendAction === "unsuspend"}
                variant="outline"
                onClick={() => void handleSuspend("unsuspend")}
              >
                {pendingSuspendAction === "unsuspend" ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Unsuspend User
              </Button>
            ) : (
              <Button
                disabled={pendingSuspendAction === "suspend"}
                variant="destructive"
                onClick={() => {
                  setActionError(null);
                  setSuspendDialogOpen(true);
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

      <Dialog
        open={suspendDialogOpen}
        onOpenChange={(open) => {
          if (!pendingSuspendAction) setSuspendDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend this user?</DialogTitle>
            <DialogDescription>
              {user.email} will be unable to sign in while suspended. Their
              data stays available for audit and recovery.
            </DialogDescription>
          </DialogHeader>
          {actionError ? (
            <ApiErrorNotice error={actionError} title="Suspension failed" />
          ) : null}
          <DialogFooter>
            <Button
              disabled={pendingSuspendAction === "suspend"}
              onClick={() => setSuspendDialogOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={pendingSuspendAction === "suspend"}
              onClick={() => void handleSuspend("suspend")}
              type="button"
              variant="destructive"
            >
              {pendingSuspendAction === "suspend" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShieldAlert className="size-4" />
              )}
              Suspend User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
