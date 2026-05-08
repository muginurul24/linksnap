"use client";

import { useCallback, useEffect, useState } from "react";
import type { ComponentType } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BarChart3,
  Clock3,
  CreditCard,
  DollarSign,
  Link2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  apiFetch,
  getFriendlyApiErrorMessage,
  isApiClientError,
} from "@/lib/api/client";
import type { AdminSystemStats, AdminTopUser } from "@/lib/db/queries/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AdminAnalyticsState =
  | { status: "loading" }
  | {
      errorMessage: string;
      requestId: string | null;
      status: "error";
    }
  | {
      stats: AdminSystemStats;
      status: "success";
    };

const PLAN_COLORS = {
  BUSINESS: "var(--chart-3)",
  FREE: "var(--chart-1)",
  PRO: "var(--chart-2)",
} as const;

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatIdr(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDateLabel(value: string): string {
  const [, month, day] = value.split("-");

  return month && day ? `${month}/${day}` : value;
}

function LoadingState() {
  return (
    <div aria-label="Loading system analytics" className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} size="sm">
            <CardHeader className="flex flex-row items-center justify-between pb-0">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-8 rounded-md" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[320px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-52" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[320px] w-full" />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

function ErrorState({
  errorMessage,
  loading,
  onRetry,
  requestId,
}: {
  errorMessage: string;
  loading: boolean;
  onRetry: () => void;
  requestId: string | null;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border bg-card p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-md bg-destructive/15 text-destructive">
        <AlertTriangle className="size-6" />
      </div>
      <div>
        <p className="text-sm font-medium">System analytics are temporarily unavailable</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {errorMessage}
        </p>
        {requestId ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Request ID: {requestId}
          </p>
        ) : null}
      </div>
      <Button disabled={loading} onClick={onRetry} size="sm" type="button" variant="outline">
        {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        Try again
      </Button>
    </div>
  );
}

function StatCard({
  description,
  icon: Icon,
  label,
  value,
}: {
  description: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card size="sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-0">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
        <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex min-h-[280px] items-center justify-center rounded-lg border border-dashed bg-muted/25 p-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function PlanDistribution({ stats }: { stats: AdminSystemStats }) {
  const rows = (["FREE", "PRO", "BUSINESS"] as const).map((plan) => ({
    count: stats.planDistribution[plan] ?? 0,
    fill: PLAN_COLORS[plan],
    plan,
  }));
  const hasPlans = rows.some((row) => row.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan Distribution</CardTitle>
        <CardDescription>Current user accounts by plan.</CardDescription>
      </CardHeader>
      <CardContent>
        {hasPlans ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_12rem]">
            <ChartContainer className="h-[280px] w-full" config={{ count: { label: "Users" } }}>
              <PieChart>
                <Pie
                  cx="50%"
                  cy="50%"
                  data={rows}
                  dataKey="count"
                  innerRadius={64}
                  nameKey="plan"
                  outerRadius={112}
                  paddingAngle={4}
                >
                  {rows.map((row) => (
                    <Cell fill={row.fill} key={row.plan} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="grid content-center gap-2">
              {rows.map((row) => (
                <div
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                  key={row.plan}
                >
                  <span className="font-medium">{row.plan}</span>
                  <Badge variant="secondary">{formatNumber(row.count)}</Badge>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyChart message="No users are available for plan distribution yet." />
        )}
      </CardContent>
    </Card>
  );
}

function GrowthTrend({ stats }: { stats: AdminSystemStats }) {
  const data = stats.growthTrend.map((point) => ({
    ...point,
    label: formatDateLabel(point.date),
  }));
  const hasGrowth = data.some(
    (point) => point.users > 0 || point.links > 0 || point.clicks > 0,
  );

  return (
    <Card className="xl:col-span-2">
      <CardHeader>
        <CardTitle>Growth Trend</CardTitle>
        <CardDescription>New users, links, and clicks over the last 30 days.</CardDescription>
      </CardHeader>
      <CardContent>
        {hasGrowth ? (
          <ChartContainer
            className="h-[320px] w-full"
            config={{
              clicks: { color: "var(--chart-3)", label: "Clicks" },
              links: { color: "var(--chart-2)", label: "Links" },
              users: { color: "var(--chart-1)", label: "Users" },
            }}
          >
            <AreaChart data={data}>
              <CartesianGrid className="stroke-muted" strokeDasharray="3 3" />
              <XAxis
                axisLine={false}
                className="text-xs"
                dataKey="label"
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                className="text-xs"
                tickLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                dataKey="clicks"
                fill="var(--chart-3)"
                fillOpacity={0.1}
                stroke="var(--chart-3)"
                strokeWidth={2}
                type="monotone"
              />
              <Area
                dataKey="links"
                fill="var(--chart-2)"
                fillOpacity={0.12}
                stroke="var(--chart-2)"
                strokeWidth={2}
                type="monotone"
              />
              <Area
                dataKey="users"
                fill="var(--chart-1)"
                fillOpacity={0.14}
                stroke="var(--chart-1)"
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <EmptyChart message="No platform growth activity in the last 30 days." />
        )}
      </CardContent>
    </Card>
  );
}

function TopUsersTable({
  emptyLabel,
  metric,
  title,
  users,
}: {
  emptyLabel: string;
  metric: "clicks" | "links";
  title: string;
  users: AdminTopUser[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Highest activity users for operational review.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {users.length === 0 ? (
          <div className="px-4 pb-4">
            <EmptyChart message={emptyLabel} />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Links</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="w-20 text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={`${metric}-${user.id}`}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {user.name ?? user.email}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.plan}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(user.totalLinks)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(user.totalClicks)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      aria-label={`Open ${user.email}`}
                      render={<Link href={`/admin/users/${user.id}`} />}
                      nativeButton={false}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <Users className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function OperationalHealth({ stats }: { stats: AdminSystemStats }) {
  const healthItems = [
    {
      description: "Administrative mutations and admin API reads recorded in audit log.",
      icon: ShieldCheck,
      label: "Admin actions",
      value: formatNumber(stats.adminActionsLast30Days),
    },
    {
      description: "Non-settled payment failures in the last 30 days.",
      icon: AlertTriangle,
      label: "Failed payments",
      value: formatNumber(stats.failedPaymentsLast30Days),
    },
    {
      description: "Payments created but not settled, canceled, denied, or expired.",
      icon: Clock3,
      label: "Pending payments",
      value: formatNumber(stats.pendingPayments),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Operational Health</CardTitle>
        <CardDescription>
          Recent admin, payment, and rate-limit signals available in the platform.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          {healthItems.map((item) => (
            <div className="rounded-lg border p-3" key={item.label}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{item.label}</p>
                <item.icon className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-2xl font-semibold">{item.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="rounded-lg border p-3">
            <p className="text-sm font-medium">Recent audit actions</p>
            {stats.recentAdminActions.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No admin audit entries in the last 30 days.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {stats.recentAdminActions.map((item) => (
                  <div className="flex items-center justify-between gap-3 text-sm" key={item.action}>
                    <span className="truncate text-muted-foreground">{item.action}</span>
                    <Badge variant="secondary">{formatNumber(item.count)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Rate limits</p>
              <Badge variant="secondary">Enforced</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Redis-backed rate limiting is active. Rate-limit event analytics are
              not persisted yet, so this panel reports enforcement status only.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ClicksLast30Chart({ stats }: { stats: AdminSystemStats }) {
  const data = stats.growthTrend.map((point) => ({
    clicks: point.clicks,
    label: formatDateLabel(point.date),
  }));
  const hasClicks = data.some((point) => point.clicks > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Click Volume</CardTitle>
        <CardDescription>Daily click volume for the last 30 days.</CardDescription>
      </CardHeader>
      <CardContent>
        {hasClicks ? (
          <ChartContainer
            className="h-[280px] w-full"
            config={{ clicks: { color: "var(--chart-2)", label: "Clicks" } }}
          >
            <BarChart data={data}>
              <CartesianGrid className="stroke-muted" vertical={false} />
              <XAxis
                axisLine={false}
                className="text-xs"
                dataKey="label"
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                className="text-xs"
                tickLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="clicks" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        ) : (
          <EmptyChart message="No clicks recorded in the last 30 days." />
        )}
      </CardContent>
    </Card>
  );
}

function SuccessState({
  loading,
  onRefresh,
  stats,
}: {
  loading: boolean;
  onRefresh: () => void;
  stats: AdminSystemStats;
}) {
  return (
    <div className="space-y-6" data-testid="admin-analytics-control-center">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">System Analytics</h1>
            <Badge variant="secondary">Read-only</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Platform control center for users, links, clicks, revenue, and operational health.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Last updated {formatDateTime(stats.lastUpdatedAt)}
          </p>
        </div>
        <Button disabled={loading} onClick={onRefresh} size="sm" type="button" variant="outline">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard
          description="All registered accounts."
          icon={Users}
          label="Total Users"
          value={formatNumber(stats.totalUsers)}
        />
        <StatCard
          description="Accounts that are not suspended."
          icon={ShieldCheck}
          label="Active Users"
          value={formatNumber(stats.activeUsers)}
        />
        <StatCard
          description={`+${formatNumber(stats.usersLast30Days)} last 30 days.`}
          icon={TrendingUp}
          label="New Users"
          value={formatNumber(stats.usersLast30Days)}
        />
        <StatCard
          description={`+${formatNumber(stats.linksLast30Days)} last 30 days.`}
          icon={Link2}
          label="Total Links"
          value={formatNumber(stats.totalLinks)}
        />
        <StatCard
          description={`${formatNumber(stats.clicksLast30Days)} last 30 days.`}
          icon={BarChart3}
          label="Total Clicks"
          value={formatNumber(stats.totalClicks)}
        />
        <StatCard
          description="Settled payment revenue."
          icon={DollarSign}
          label="Revenue"
          value={formatIdr(stats.settledRevenueIdr)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <GrowthTrend stats={stats} />
        <PlanDistribution stats={stats} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ClicksLast30Chart stats={stats} />
        <Card>
          <CardHeader>
            <CardTitle>Revenue Snapshot</CardTitle>
            <CardDescription>Payment settlement and pending state.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <CreditCard className="size-5 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Settled revenue</p>
              <p className="mt-1 text-2xl font-semibold">
                {formatIdr(stats.settledRevenueIdr)}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <Clock3 className="size-5 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Pending payments</p>
              <p className="mt-1 text-2xl font-semibold">
                {formatNumber(stats.pendingPayments)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <TopUsersTable
          emptyLabel="No user link activity yet."
          metric="links"
          title="Top Users by Links"
          users={stats.topUsersByLinks}
        />
        <TopUsersTable
          emptyLabel="No user click activity yet."
          metric="clicks"
          title="Top Users by Clicks"
          users={stats.topUsersByClicks}
        />
      </div>

      <OperationalHealth stats={stats} />
    </div>
  );
}

async function fetchAdminAnalyticsStats(): Promise<AdminSystemStats> {
  return apiFetch<AdminSystemStats>("/api/v1/admin/analytics", {
    cache: "no-store",
  });
}

function toErrorState(error: unknown): Extract<AdminAnalyticsState, { status: "error" }> {
  return {
    errorMessage: getFriendlyApiErrorMessage(error),
    requestId: isApiClientError(error) ? error.requestId : null,
    status: "error",
  };
}

export function AdminAnalyticsClient() {
  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [state, setState] = useState<AdminAnalyticsState>({ status: "loading" });

  const loadStats = useCallback(async () => {
    setLoadingRefresh(true);
    try {
      const stats = await fetchAdminAnalyticsStats();
      setState({ stats, status: "success" });
    } catch (error) {
      setState(toErrorState(error));
    } finally {
      setLoadingRefresh(false);
    }
  }, []);

  useEffect(() => {
    let canceled = false;

    async function loadInitialStats() {
      try {
        const stats = await fetchAdminAnalyticsStats();
        if (!canceled) setState({ stats, status: "success" });
      } catch (error) {
        if (!canceled) setState(toErrorState(error));
      }
    }

    void loadInitialStats();

    return () => {
      canceled = true;
    };
  }, []);

  if (state.status === "loading") {
    return <LoadingState />;
  }

  if (state.status === "error") {
    return (
      <ErrorState
        errorMessage={state.errorMessage}
        loading={loadingRefresh}
        onRetry={() => void loadStats()}
        requestId={state.requestId}
      />
    );
  }

  return (
    <SuccessState
      loading={loadingRefresh}
      onRefresh={() => void loadStats()}
      stats={state.stats}
    />
  );
}
