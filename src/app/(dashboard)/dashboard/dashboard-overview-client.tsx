"use client";

import { useState, type ComponentType } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  Link2,
  Megaphone,
  MoreHorizontal,
  MousePointerClick,
  Plus,
  QrCode,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DashboardOverview } from "@/lib/dashboard/overview";
import { getDashboardOnboardingState } from "@/lib/dashboard/onboarding";

type StatCard = {
  description: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  value: string;
};

type DashboardOverviewClientProps = {
  overview: DashboardOverview;
};

const numberFormatter = new Intl.NumberFormat("en");
const ONBOARDING_DISMISSED_KEY = "linksnap:dashboard-onboarding-dismissed:v1";

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function getStatsCards(overview: DashboardOverview): StatCard[] {
  return [
    {
      description: "Owned short links",
      icon: Link2,
      title: "Total Links",
      value: formatNumber(overview.totalLinks),
    },
    {
      description: "Redirects and Link Page views",
      icon: MousePointerClick,
      title: "Clicks Today",
      value: formatNumber(overview.clicksToday),
    },
    {
      description: "Campaigns with active links",
      icon: Megaphone,
      title: "Active Campaigns",
      value: formatNumber(overview.activeCampaigns),
    },
    {
      description: "QR-attributed clicks",
      icon: QrCode,
      title: "QR Scans",
      value: formatNumber(overview.qrScans),
    },
  ];
}

function getShareUrl(slug: string): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL
    ?.trim()
    .replace(/\/+$/, "");
  const runtimeBaseUrl =
    typeof window === "undefined" ? "" : window.location.origin;

  return `${configuredBaseUrl || runtimeBaseUrl || "https://www.justqiu.cloud"}/${slug}`;
}

function DashboardOnboarding({ overview }: DashboardOverviewClientProps) {
  const [isDismissed, setIsDismissed] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem(ONBOARDING_DISMISSED_KEY) === "true",
  );
  const onboarding = getDashboardOnboardingState(overview);

  const dismiss = () => {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
    setIsDismissed(true);
  };

  const copyFirstLink = async () => {
    if (!onboarding.firstLinkSlug) return;

    await navigator.clipboard.writeText(getShareUrl(onboarding.firstLinkSlug));
    toast.success("Link copied.");
  };

  if (isDismissed || (!onboarding.showChecklist && !onboarding.showShareCta)) {
    return null;
  }

  if (onboarding.showShareCta && onboarding.firstLinkSlug) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Share your first link</p>
            <p className="text-sm text-muted-foreground">
              /{onboarding.firstLinkSlug} is ready. Copy it and collect the first click.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void copyFirstLink()} size="sm" type="button">
              <Copy className="size-4" />
              Copy Link
            </Button>
            <Button onClick={dismiss} size="icon-sm" type="button" variant="ghost">
              <X className="size-4" />
              <span className="sr-only">Dismiss onboarding</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">Launch checklist</CardTitle>
          <p className="text-sm text-muted-foreground">
            Complete these steps to turn a new account into a trackable link workflow.
          </p>
        </div>
        <Button onClick={dismiss} size="icon-sm" type="button" variant="ghost">
          <X className="size-4" />
          <span className="sr-only">Dismiss onboarding</span>
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {onboarding.steps.map((step) => {
          const Icon = step.completed ? CheckCircle2 : Circle;

          return (
            <div
              className="flex items-start gap-3 rounded-lg border bg-background p-3"
              key={step.id}
            >
              <Icon
                className={
                  step.completed
                    ? "mt-0.5 size-5 text-primary"
                    : "mt-0.5 size-5 text-muted-foreground"
                }
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{step.title}</p>
                <ButtonLink
                  className="mt-2"
                  href={step.actionHref}
                  size="sm"
                  variant={step.completed ? "outline" : "default"}
                >
                  {step.actionLabel}
                </ButtonLink>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function RecentLinksTable({ overview }: DashboardOverviewClientProps) {
  if (overview.totalLinks === 0) {
    return (
      <EmptyState
        actionHref="/links/new"
        actionLabel="Create your first link"
        description="Create a short link to start collecting clicks, countries, and campaign data."
        icon={<Link2 className="size-5" />}
        title="No links yet. Create your first link."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Link</TableHead>
          <TableHead className="hidden md:table-cell">Destination</TableHead>
          <TableHead className="hidden sm:table-cell">Features</TableHead>
          <TableHead className="text-right">Clicks</TableHead>
          <TableHead className="hidden lg:table-cell">Created</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {overview.recentLinks.map((link) => (
          <TableRow key={link.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                  <Link2 className="size-4 text-primary" />
                </div>
                <div>
                  <p className="font-mono text-sm font-medium">/{link.slug}</p>
                  <p className="text-xs text-muted-foreground">
                    www.justqiu.cloud/{link.slug}
                  </p>
                </div>
              </div>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <p className="max-w-[200px] truncate text-sm text-muted-foreground">
                {link.destinationUrl}
              </p>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              {link.hasLinkPage ? (
                <Badge variant="secondary" className="text-xs">
                  Link Page
                </Badge>
              ) : null}
            </TableCell>
            <TableCell className="text-right font-mono font-medium tabular-nums">
              {formatNumber(link.clicks)}
            </TableCell>
            <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
              {link.createdLabel}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="icon" className="size-8" />}
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <ExternalLink className="mr-2 size-4" /> Open
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Copy className="mr-2 size-4" /> Copy URL
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <BarChart3 className="mr-2 size-4" /> Analytics
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="mr-2 size-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function DashboardOverviewClient({
  overview,
}: DashboardOverviewClientProps) {
  const statsCards = getStatsCards(overview);

  return (
    <>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back! Here&apos;s your link performance overview.
          </p>
        </div>
        <ButtonLink href="/links/new" size="sm" className="mt-2 sm:mt-0">
          <Plus className="size-4" /> Create Link
        </ButtonLink>
      </div>

      <DashboardOnboarding overview={overview} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Click Trend (7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ clicks: { label: "Clicks", color: "hsl(var(--primary))" } }}
              className="h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={overview.clickTrend}>
                  <defs>
                    <linearGradient id="clickGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="clicks"
                    stroke="hsl(var(--primary))"
                    fill="url(#clickGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Countries</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                clicks: { label: "Clicks", color: "hsl(var(--chart-1))" },
              }}
              className="h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={overview.topCountries}
                  layout="vertical"
                  margin={{ left: -20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                    horizontal={false}
                  />
                  <XAxis type="number" className="text-xs" />
                  <YAxis
                    type="category"
                    dataKey="country"
                    className="text-xs"
                    width={80}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="clicks"
                    fill="hsl(var(--chart-1))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Links</CardTitle>
          <ButtonLink href="/links" variant="outline" size="sm">
            View All
          </ButtonLink>
        </CardHeader>
        <CardContent>
          <RecentLinksTable overview={overview} />
        </CardContent>
      </Card>
    </>
  );
}
