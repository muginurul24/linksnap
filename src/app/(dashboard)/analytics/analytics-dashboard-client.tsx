"use client";

import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowUpRight,
  ExternalLink,
  Globe2,
  Link2,
  MonitorSmartphone,
  MousePointerClick,
  PanelTop,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CountMetric } from "@/lib/analytics/summary";
import type { DashboardAnalyticsSummary } from "@/lib/analytics/dashboard";
import { cn } from "@/lib/utils";

type AnalyticsDashboardClientProps = {
  summary: DashboardAnalyticsSummary;
};

const DEVICE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: value > 0 && value < 0.01 ? 1 : 0,
    style: "percent",
  }).format(value);
}

function formatDateLabel(value: string): string {
  const [, month, day] = value.split("-");

  return month && day ? `${month}/${day}` : value;
}

function NoDataPanel({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/25 p-6 text-center">
      <Activity className="size-8 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function ChartCard({
  children,
  description,
  emptyDescription,
  emptyTitle,
  hasData,
  title,
  className,
}: {
  children: ReactNode;
  description: string;
  emptyDescription: string;
  emptyTitle: string;
  hasData: boolean;
  title: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          children
        ) : (
          <NoDataPanel description={emptyDescription} title={emptyTitle} />
        )}
      </CardContent>
    </Card>
  );
}

function MetricCard({
  description,
  icon: Icon,
  label,
  testId,
  value,
}: {
  description: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  testId: string;
  value: string;
}) {
  return (
    <Card data-testid={testId} size="sm">
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

function RankedMetricList({
  emptyLabel,
  items,
  title,
}: {
  emptyLabel: string;
  items: CountMetric[];
  title: string;
}) {
  return (
    <div className="rounded-lg border">
      <div className="border-b px-3 py-2 text-sm font-medium">{title}</div>
      {items.length === 0 ? (
        <p className="px-3 py-4 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ol className="divide-y">
          {items.map((item, index) => (
            <li
              className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 text-sm"
              key={`${item.label}-${index}`}
            >
              <span className="text-xs tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <span className="truncate">{item.label}</span>
              <Badge variant="secondary">{formatNumber(item.count)}</Badge>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function FunnelSection({ summary }: { summary: DashboardAnalyticsSummary }) {
  const linkPage = summary.linkPageAnalytics;
  const hasFunnelData = linkPage.pageViews > 0 || linkPage.ctaClicks > 0;
  const maxValue = Math.max(linkPage.pageViews, linkPage.ctaClicks, 1);
  const ctaWidth = Math.max(4, (linkPage.ctaClicks / maxValue) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Link Page Funnel</CardTitle>
        <CardDescription>
          Views to CTA clicks to click-through rate.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasFunnelData ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Page views</p>
                <p className="mt-1 text-xl font-semibold">
                  {formatNumber(linkPage.pageViews)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">CTA clicks</p>
                <p className="mt-1 text-xl font-semibold">
                  {formatNumber(linkPage.ctaClicks)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">CTA rate</p>
                <p className="mt-1 text-xl font-semibold">
                  {formatPercent(linkPage.ctaClickThroughRate)}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Page views</span>
                  <span>{formatNumber(linkPage.pageViews)}</span>
                </div>
                <svg
                  aria-label={`${formatNumber(linkPage.pageViews)} Link Page views`}
                  className="h-2 w-full rounded-full"
                  preserveAspectRatio="none"
                  role="img"
                  viewBox="0 0 100 8"
                >
                  <rect className="fill-muted" height="8" rx="4" width="100" />
                  <rect className="fill-primary" height="8" rx="4" width="100" />
                </svg>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">CTA clicks</span>
                  <span>{formatNumber(linkPage.ctaClicks)}</span>
                </div>
                <svg
                  aria-label={`${formatNumber(linkPage.ctaClicks)} Link Page CTA clicks`}
                  className="h-2 w-full rounded-full"
                  preserveAspectRatio="none"
                  role="img"
                  viewBox="0 0 100 8"
                >
                  <rect className="fill-muted" height="8" rx="4" width="100" />
                  <rect
                    className="fill-chart-2"
                    height="8"
                    rx="4"
                    width={ctaWidth}
                  />
                </svg>
              </div>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="font-medium">With countdown</p>
                <p className="mt-1 text-muted-foreground">
                  {formatNumber(linkPage.countdown.views)} views,
                  {" "}
                  {formatPercent(linkPage.countdown.ctaClickThroughRate)} CTA rate
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="font-medium">Without countdown</p>
                <p className="mt-1 text-muted-foreground">
                  {formatNumber(linkPage.withoutCountdown.views)} views,
                  {" "}
                  {formatPercent(linkPage.withoutCountdown.ctaClickThroughRate)} CTA rate
                </p>
              </div>
            </div>
          </div>
        ) : (
          <NoDataPanel
            description="Create a Link Page or wait for visitor activity to compare views, CTA clicks, and conversion rate."
            title="No Link Page funnel data"
          />
        )}
      </CardContent>
    </Card>
  );
}

function GeographySection({ summary }: { summary: DashboardAnalyticsSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Locations</CardTitle>
        <CardDescription>
          Countries and cities ranked by clicks in the selected range.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <RankedMetricList
          emptyLabel="No country data for this range."
          items={summary.topCountries}
          title="Countries"
        />
        <RankedMetricList
          emptyLabel="No city data for this range."
          items={summary.topCities}
          title="Cities"
        />
      </CardContent>
    </Card>
  );
}

function TopLinksTable({ summary }: { summary: DashboardAnalyticsSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Links</CardTitle>
        <CardDescription>
          Short links with the most click activity in this range.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {summary.topLinks.length === 0 ? (
          <div className="px-4 pb-4">
            <NoDataPanel
              description="Once a link receives clicks, it will appear here with quick access to manage it."
              title="No top links yet"
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slug</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="w-20 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.topLinks.map((link) => (
                <TableRow key={link.id}>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-2">
                      <Link2 className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{link.slug}</p>
                        {link.title ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {link.title}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate text-muted-foreground">
                    {link.destinationUrl}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatNumber(link.totalClicks)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      aria-label={`Edit ${link.slug}`}
                      render={
                        <Link href={`/links/${encodeURIComponent(link.slug)}/edit`} />
                      }
                      size="icon-sm"
                      variant="ghost"
                    >
                      <ExternalLink className="size-4" />
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

export function AnalyticsDashboardClient({
  summary,
}: AnalyticsDashboardClientProps) {
  const dailyClicks = summary.clicksPerDay.map((item) => ({
    clicks: item.totalClicks,
    date: item.date,
    label: formatDateLabel(item.date),
  }));
  const deviceData = summary.deviceBreakdown.map((item, index) => ({
    color: DEVICE_COLORS[index % DEVICE_COLORS.length],
    name: item.label,
    value: item.count,
  }));
  const referrerData = summary.topReferrers.map((item) => ({
    clicks: item.count,
    source: item.label,
  }));
  const hasDailyClicks = dailyClicks.some((item) => item.clicks > 0);
  const hasDeviceData = deviceData.some((item) => item.value > 0);
  const hasReferrerData = referrerData.some((item) => item.clicks > 0);

  return (
    <div className="space-y-4" data-testid="analytics-dashboard">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          description="Direct redirects and Link Page CTA clicks."
          icon={MousePointerClick}
          label="Total clicks"
          testId="analytics-kpi-total-clicks"
          value={formatNumber(summary.totalClicks)}
        />
        <MetricCard
          description="Distinct visitors from hashed IPs."
          icon={Users}
          label="Unique visitors"
          testId="analytics-kpi-unique-visitors"
          value={formatNumber(summary.uniqueVisitors)}
        />
        <MetricCard
          description="Visits to Link Page experiences."
          icon={PanelTop}
          label="Link Page views"
          testId="analytics-kpi-link-page-views"
          value={formatNumber(summary.linkPageAnalytics.pageViews)}
        />
        <MetricCard
          description="Visitors who clicked the Link Page CTA."
          icon={ArrowUpRight}
          label="CTA rate"
          testId="analytics-kpi-cta-rate"
          value={formatPercent(summary.linkPageAnalytics.ctaClickThroughRate)}
        />
        <MetricCard
          description="Clicks that bypassed Link Pages."
          icon={Globe2}
          label="Direct redirects"
          testId="analytics-kpi-direct-redirects"
          value={formatNumber(summary.linkPageAnalytics.directRedirects)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          description="Daily click volume across all links."
          emptyDescription="Share a link or widen the date range to see the click trend."
          emptyTitle="No clicks in this range"
          hasData={hasDailyClicks}
          title="Click Trend"
        >
          <ChartContainer
            className="h-[320px] w-full"
            config={{
              clicks: { color: "var(--primary)", label: "Clicks" },
            }}
          >
            <AreaChart data={dailyClicks}>
              <defs>
                <linearGradient id="analyticsClickGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--primary)"
                    stopOpacity={0.28}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--primary)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
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
                fill="url(#analyticsClickGradient)"
                stroke="var(--primary)"
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ChartContainer>
        </ChartCard>

        <FunnelSection summary={summary} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          description="Device mix for click traffic."
          emptyDescription="Device data appears once tracked clicks include device metadata."
          emptyTitle="No device breakdown"
          hasData={hasDeviceData}
          title="Device Distribution"
        >
          <ChartContainer
            className="h-[300px] w-full"
            config={{ value: { label: "Clicks" } }}
          >
            <PieChart>
              <Pie
                cx="50%"
                cy="50%"
                data={deviceData}
                dataKey="value"
                innerRadius={66}
                nameKey="name"
                outerRadius={118}
                paddingAngle={4}
              >
                {deviceData.map((entry) => (
                  <Cell fill={entry.color} key={entry.name} />
                ))}
              </Pie>
              <Legend iconSize={10} />
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard
          description="Sources that referred visitors to your links."
          emptyDescription="Referrer data is unavailable for direct or privacy-filtered traffic."
          emptyTitle="No referrer data"
          hasData={hasReferrerData}
          title="Top Referrers"
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
            <ChartContainer
              className="h-[300px] w-full"
              config={{
                clicks: { color: "var(--chart-1)", label: "Clicks" },
              }}
            >
              <BarChart data={referrerData} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid
                  className="stroke-muted"
                  horizontal={false}
                  strokeDasharray="3 3"
                />
                <XAxis
                  allowDecimals={false}
                  axisLine={false}
                  className="text-xs"
                  tickLine={false}
                  type="number"
                />
                <YAxis
                  axisLine={false}
                  className="text-xs"
                  dataKey="source"
                  tickFormatter={(value: string) =>
                    value.length > 14 ? `${value.slice(0, 14)}...` : value
                  }
                  tickLine={false}
                  type="category"
                  width={104}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="clicks"
                  fill="var(--chart-1)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
            <RankedMetricList
              emptyLabel="No referrers yet."
              items={summary.topReferrers}
              title="Ranked"
            />
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <GeographySection summary={summary} />
        <Card>
          <CardHeader>
            <CardTitle>Browser Mix</CardTitle>
            <CardDescription>
              Browser metadata from recent click events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RankedMetricList
              emptyLabel="No browser data for this range."
              items={summary.browserBreakdown}
              title="Browsers"
            />
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
              <MonitorSmartphone className="size-4 shrink-0" />
              <span className={cn(summary.totalClicks === 0 && "text-muted-foreground")}>
                Device and browser fields depend on tracked click metadata.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <TopLinksTable summary={summary} />
    </div>
  );
}
