import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  DollarSign,
  Link2,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildAdminDashboardCards,
  formatAdminMetricNumber,
} from "@/lib/admin/dashboard-summary";
import { requireSuperAdmin } from "@/lib/auth/superadmin";
import { getSystemStats } from "@/lib/db/queries/admin";
import { listAdminAuditLogs } from "@/lib/db/queries/admin-audit";

const STAT_ICONS = [Users, Link2, BarChart3, DollarSign] as const;

function formatAuditAction(action: string): string {
  return action
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatAuditDate(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

async function requireAdminAccess(): Promise<void> {
  const authResult = await requireSuperAdmin();

  if (!authResult.ok) {
    redirect(
      authResult.status === 401 ? "/login?callbackUrl=/admin" : "/dashboard",
    );
  }
}

export default async function AdminDashboardPage() {
  await requireAdminAccess();

  const [stats, auditLog] = await Promise.all([
    getSystemStats(),
    listAdminAuditLogs({ limit: 5, page: 1 }),
  ]);
  const statCards = buildAdminDashboardCards(stats);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Platform overview, operational health, and quick admin actions.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => {
          const Icon = STAT_ICONS[index] ?? BarChart3;

          return (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <Button
              className="justify-start"
              nativeButton={false}
              render={<Link href="/admin/users" />}
              variant="outline"
            >
              <Users className="size-4" />
              Manage Users
            </Button>
            <Button
              className="justify-start"
              nativeButton={false}
              render={<Link href="/admin/audit-log" />}
              variant="outline"
            >
              <Shield className="size-4" />
              View Audit Log
            </Button>
            <Button
              className="justify-start"
              nativeButton={false}
              render={<Link href="/admin/analytics" />}
              variant="outline"
            >
              <TrendingUp className="size-4" />
              System Analytics
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Recent Audit Log</CardTitle>
              <p className="text-sm text-muted-foreground">
                {formatAdminMetricNumber(auditLog.total)} total recorded actions
              </p>
            </div>
            <Button
              nativeButton={false}
              render={<Link href="/admin/audit-log" />}
              size="sm"
              variant="outline"
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {auditLog.entries.length === 0 ? (
              <div className="rounded-lg border bg-muted/25 p-4 text-sm text-muted-foreground">
                No admin actions have been recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {auditLog.entries.map((entry) => (
                  <div
                    className="flex items-start justify-between gap-3 rounded-lg border bg-background p-3"
                    key={entry.id}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {formatAuditAction(entry.action)}
                        </p>
                        {entry.targetUserId ? (
                          <Badge variant="secondary">User target</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                        Admin: {entry.adminUserId}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-muted-foreground">
                      {formatAuditDate(entry.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
