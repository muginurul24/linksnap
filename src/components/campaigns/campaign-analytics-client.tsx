"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from "react";
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
  AlertCircle,
  ArrowUpRight,
  Calendar,
  Download,
  ExternalLink,
  Link2,
  MousePointerClick,
  RefreshCw,
  Users,
} from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CountMetric } from "@/lib/analytics/summary";

type CampaignOption = {
  id: string;
  linkCount: number;
  name: string;
  slug: string;
};

type TopCampaignLink = {
  destinationUrl: string;
  id: string;
  slug: string;
  title: string | null;
  totalClicks: number;
};

type LinkPageAnalytics = {
  ctaClickThroughRate: number;
  ctaClicks: number;
  countdown: {
    ctaClickThroughRate: number;
    ctaClicks: number;
    views: number;
  };
  directRedirects: number;
  pageViews: number;
  withoutCountdown: {
    ctaClickThroughRate: number;
    ctaClicks: number;
    views: number;
  };
};

type CampaignAnalyticsSummary = {
  browserBreakdown: CountMetric[];
  clicksPerDay: Array<{ date: string; totalClicks: number }>;
  deviceBreakdown: CountMetric[];
  linkPageAnalytics: LinkPageAnalytics;
  topCities: CountMetric[];
  topCountries: CountMetric[];
  topReferrers: CountMetric[];
  totalClicks: number;
  uniqueClicks: number;
};

type CampaignAnalyticsComparison = CampaignAnalyticsSummary & CampaignOption;

type CampaignAnalyticsPayload = CampaignAnalyticsSummary & {
  campaign: CampaignOption;
  comparisons: CampaignAnalyticsComparison[];
  range: {
    from: string;
    to: string;
  };
  topLinks: TopCampaignLink[];
};

type ApiEnvelope<T> =
  | { data: T; success: true }
  | {
      error: {
        code: string;
        message: string;
        requestId?: string;
      };
      success: false;
    };

type CampaignAnalyticsClientProps = {
  campaign: CampaignOption;
  comparisonCampaigns: CampaignOption[];
};

type RangeKey = "7" | "30" | "custom";

class CampaignAnalyticsFetchError extends Error {
  requestId?: string;

  constructor(message: string, requestId?: string) {
    super(message);
    this.requestId = requestId;
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DEVICE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  ));
}

function endOfUtcDay(date: Date): Date {
  return new Date(startOfUtcDay(date).getTime() + DAY_MS - 1);
}

function dateInputToStartIso(value: string): string {
  return startOfUtcDay(new Date(`${value}T00:00:00.000Z`)).toISOString();
}

function dateInputToEndIso(value: string): string {
  return endOfUtcDay(new Date(`${value}T00:00:00.000Z`)).toISOString();
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function presetDateRange(days: 7 | 30): { from: string; to: string } {
  const now = new Date();
  const to = toDateInputValue(now);
  const from = toDateInputValue(
    new Date(startOfUtcDay(now).getTime() - (days - 1) * DAY_MS),
  );

  return { from, to };
}

function formatDateLabel(value: string): string {
  const [, month, day] = value.split("-");

  return month && day ? `${month}/${day}` : value;
}

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

function escapeCsvValue(value: string | number): string {
  const text = String(value);
  if (!/[",\n]/.test(text)) return text;

  return `"${text.replaceAll("\"", "\"\"")}"`;
}

function csvRow(values: Array<string | number>): string {
  return values.map(escapeCsvValue).join(",");
}

function buildCampaignCsv(data: CampaignAnalyticsPayload): string {
  const rows = [
    csvRow(["section", "label", "count"]),
    csvRow(["campaign", data.campaign.slug, data.campaign.name]),
    csvRow(["range", "from", data.range.from]),
    csvRow(["range", "to", data.range.to]),
    csvRow(["summary", "totalClicks", data.totalClicks]),
    csvRow(["summary", "uniqueVisitors", data.uniqueClicks]),
    csvRow(["summary", "links", data.campaign.linkCount]),
    csvRow([
      "summary",
      "ctaClickThroughRate",
      data.linkPageAnalytics.ctaClickThroughRate,
    ]),
    ...data.clicksPerDay.map((item) =>
      csvRow(["dailyClicks", item.date, item.totalClicks]),
    ),
    ...data.deviceBreakdown.map((item) =>
      csvRow(["devices", item.label, item.count]),
    ),
    ...data.topReferrers.map((item) =>
      csvRow(["referrers", item.label, item.count]),
    ),
    ...data.topCountries.map((item) =>
      csvRow(["countries", item.label, item.count]),
    ),
    ...data.topCities.map((item) =>
      csvRow(["cities", item.label, item.count]),
    ),
    ...data.topLinks.map((item) =>
      csvRow(["topLinks", item.slug, item.totalClicks]),
    ),
  ];

  return `${rows.join("\n")}\n`;
}

function toCsvDataUri(csv: string): string {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
}

async function parseCampaignAnalyticsResponse(
  response: Response,
): Promise<CampaignAnalyticsPayload> {
  const body = (await response.json()) as ApiEnvelope<CampaignAnalyticsPayload>;

  if (!response.ok || !body.success) {
    throw new CampaignAnalyticsFetchError(
      body.success ? "Unable to load campaign analytics." : body.error.message,
      body.success ? undefined : body.error.requestId,
    );
  }

  return body.data;
}

function hasAnalyticsData(data: CampaignAnalyticsPayload): boolean {
  return (
    data.totalClicks > 0 ||
    data.linkPageAnalytics.pageViews > 0 ||
    data.linkPageAnalytics.ctaClicks > 0
  );
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
              key={`${title}-${item.label}-${index}`}
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

function LoadingState() {
  return (
    <div className="space-y-4" data-testid="campaign-analytics-loading">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} size="sm">
            <CardHeader>
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-[320px] w-full" />
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
  requestId,
}: {
  message: string;
  onRetry: () => void;
  requestId?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border bg-card p-8 text-center">
      <div className="flex size-11 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
        <AlertCircle className="size-5" />
      </div>
      <div>
        <p className="text-sm font-medium">Campaign analytics could not load</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
        {requestId ? (
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            Request ID: {requestId}
          </p>
        ) : null}
      </div>
      <Button onClick={onRetry} size="sm" type="button" variant="outline">
        <RefreshCw className="size-4" />
        Retry
      </Button>
    </div>
  );
}

function RangeControls({
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  onCustomSubmit,
  onPresetChange,
  rangeKey,
}: {
  customFrom: string;
  customTo: string;
  onCustomFromChange: (value: string) => void;
  onCustomSubmit: () => void;
  onCustomToChange: (value: string) => void;
  onPresetChange: (days: 7 | 30) => void;
  rangeKey: RangeKey;
}) {
  return (
    <div className="flex w-full flex-col gap-2 lg:items-end">
      <div
        aria-label="Campaign analytics date range"
        className="grid grid-cols-2 rounded-lg border bg-background p-1 sm:inline-grid sm:w-auto"
        role="group"
      >
        {[
          { days: 7 as const, key: "7" as const, label: "7D" },
          { days: 30 as const, key: "30" as const, label: "30D" },
        ].map((option) => (
          <Button
            className="justify-center rounded-md"
            key={option.key}
            onClick={() => onPresetChange(option.days)}
            size="sm"
            type="button"
            variant={rangeKey === option.key ? "default" : "ghost"}
          >
            <Calendar className="size-4" />
            {option.label}
          </Button>
        ))}
      </div>
      <form
        className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-[9rem_9rem_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          onCustomSubmit();
        }}
      >
        <Input
          aria-label="Campaign analytics from date"
          className="w-full"
          max={customTo}
          onChange={(event) => onCustomFromChange(event.target.value)}
          type="date"
          value={customFrom}
        />
        <Input
          aria-label="Campaign analytics to date"
          className="w-full"
          min={customFrom}
          onChange={(event) => onCustomToChange(event.target.value)}
          type="date"
          value={customTo}
        />
        <Button
          className="col-span-2 sm:col-span-1"
          size="sm"
          type="submit"
          variant={rangeKey === "custom" ? "default" : "outline"}
        >
          Apply
        </Button>
      </form>
    </div>
  );
}

function ComparisonSelector({
  options,
  selectedSlugs,
  setSelectedSlugs,
}: {
  options: CampaignOption[];
  selectedSlugs: string[];
  setSelectedSlugs: (slugs: string[]) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Compare Campaigns</CardTitle>
        <CardDescription>
          Select up to five campaigns to benchmark against this one.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Create another campaign to enable comparison.
          </p>
        ) : (
          <fieldset className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {options.map((option) => {
              const isSelected = selectedSlugs.includes(option.slug);
              const isDisabled = !isSelected && selectedSlugs.length >= 5;

              return (
                <label
                  className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
                  key={option.id}
                >
                  <input
                    checked={isSelected}
                    className="size-4 accent-primary"
                    disabled={isDisabled}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setSelectedSlugs([...selectedSlugs, option.slug]);
                        return;
                      }

                      setSelectedSlugs(
                        selectedSlugs.filter((slug) => slug !== option.slug),
                      );
                    }}
                    type="checkbox"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {option.name}
                    </span>
                    <span className="block truncate font-mono text-xs text-muted-foreground">
                      /{option.slug}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>
        )}
      </CardContent>
    </Card>
  );
}

function ComparisonResults({
  comparisons,
}: {
  comparisons: CampaignAnalyticsComparison[];
}) {
  if (comparisons.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparison Snapshot</CardTitle>
        <CardDescription>
          Campaign totals for the selected date range.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {comparisons.map((item) => (
          <div className="rounded-lg border p-3" key={item.id}>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.name}</p>
              <p className="truncate font-mono text-xs text-muted-foreground">
                /{item.slug}
              </p>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Clicks</dt>
                <dd className="font-semibold tabular-nums">
                  {formatNumber(item.totalClicks)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Visitors</dt>
                <dd className="font-semibold tabular-nums">
                  {formatNumber(item.uniqueClicks)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">CTR</dt>
                <dd className="font-semibold tabular-nums">
                  {formatPercent(item.linkPageAnalytics.ctaClickThroughRate)}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function FunnelSection({ data }: { data: CampaignAnalyticsPayload }) {
  const linkPage = data.linkPageAnalytics;
  const hasFunnelData = linkPage.pageViews > 0 || linkPage.ctaClicks > 0;
  const maxValue = Math.max(linkPage.pageViews, linkPage.ctaClicks, 1);
  const ctaWidth = Math.max(4, (linkPage.ctaClicks / maxValue) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Link Page Funnel</CardTitle>
        <CardDescription>Views to CTA clicks to conversion rate.</CardDescription>
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
                  aria-label={`${formatNumber(linkPage.ctaClicks)} CTA clicks`}
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
          </div>
        ) : (
          <NoDataPanel
            description="Create Link Pages inside this campaign or wait for visitor activity to compare views and CTA clicks."
            title="No Link Page funnel data"
          />
        )}
      </CardContent>
    </Card>
  );
}

function BreakdownSection({ data }: { data: CampaignAnalyticsPayload }) {
  const deviceData = data.deviceBreakdown.map((item, index) => ({
    color: DEVICE_COLORS[index % DEVICE_COLORS.length],
    name: item.label,
    value: item.count,
  }));
  const referrerData = data.topReferrers.map((item) => ({
    clicks: item.count,
    source: item.label,
  }));
  const hasDeviceData = deviceData.some((item) => item.value > 0);
  const hasReferrerData = referrerData.some((item) => item.clicks > 0);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Device Breakdown</CardTitle>
          <CardDescription>Device mix for campaign traffic.</CardDescription>
        </CardHeader>
        <CardContent>
          {hasDeviceData ? (
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
          ) : (
            <NoDataPanel
              description="Device data appears once tracked clicks include browser metadata."
              title="No device data"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Referrer Breakdown</CardTitle>
          <CardDescription>Sources sending traffic to this campaign.</CardDescription>
        </CardHeader>
        <CardContent>
          {hasReferrerData ? (
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
                  <Bar dataKey="clicks" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
              <RankedMetricList
                emptyLabel="No referrers yet."
                items={data.topReferrers}
                title="Ranked"
              />
            </div>
          ) : (
            <NoDataPanel
              description="Referrers appear when visitors arrive from external pages or social apps."
              title="No referrer data"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Geo Breakdown</CardTitle>
          <CardDescription>Top countries and cities for this campaign.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <RankedMetricList
            emptyLabel="No country data for this range."
            items={data.topCountries}
            title="Countries"
          />
          <RankedMetricList
            emptyLabel="No city data for this range."
            items={data.topCities}
            title="Cities"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Browser Breakdown</CardTitle>
          <CardDescription>Browser metadata from tracked campaign clicks.</CardDescription>
        </CardHeader>
        <CardContent>
          <RankedMetricList
            emptyLabel="No browser data for this range."
            items={data.browserBreakdown}
            title="Browsers"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function TopLinksTable({ data }: { data: CampaignAnalyticsPayload }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Links</CardTitle>
        <CardDescription>
          Top 5 links in this campaign ranked by click activity.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {data.topLinks.length === 0 ? (
          <div className="px-4 pb-4">
            <NoDataPanel
              description="Attach links to this campaign and share them to populate this table."
              title="No top links yet"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[680px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Slug</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="w-24 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topLinks.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-2">
                        <Link2 className="size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">/{link.slug}</p>
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
                        nativeButton={false}
                        render={
                          <Link
                            href={`/links/${encodeURIComponent(link.slug)}/edit`}
                          />
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AnalyticsContent({ data }: { data: CampaignAnalyticsPayload }) {
  const dailyClicks = data.clicksPerDay.map((item) => ({
    clicks: item.totalClicks,
    date: item.date,
    label: formatDateLabel(item.date),
  }));
  const hasDailyClicks = dailyClicks.some((item) => item.clicks > 0);
  const hasData = hasAnalyticsData(data);

  return (
    <div className="space-y-4" data-testid="campaign-analytics-dashboard">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          description="Redirects and Link Page views in this campaign."
          icon={MousePointerClick}
          label="Total Clicks"
          testId="campaign-kpi-total-clicks"
          value={formatNumber(data.totalClicks)}
        />
        <MetricCard
          description="Distinct visitors from hashed IPs."
          icon={Users}
          label="Unique Visitors"
          testId="campaign-kpi-unique-visitors"
          value={formatNumber(data.uniqueClicks)}
        />
        <MetricCard
          description="Short links attached to this campaign."
          icon={Link2}
          label="Links"
          testId="campaign-kpi-links"
          value={formatNumber(data.campaign.linkCount)}
        />
        <MetricCard
          description="CTA clicks divided by Link Page views."
          icon={ArrowUpRight}
          label="CTR"
          testId="campaign-kpi-ctr"
          value={formatPercent(data.linkPageAnalytics.ctaClickThroughRate)}
        />
      </div>

      {!hasData ? (
        <EmptyState
          actionHref="/links"
          actionLabel="Share Campaign Links"
          description="Share your campaign links to start collecting click, device, location, and referrer analytics."
          icon={<MousePointerClick className="size-5" />}
          title="No clicks yet for this campaign."
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Click Trend</CardTitle>
            <CardDescription>Daily click volume for this campaign.</CardDescription>
          </CardHeader>
          <CardContent>
            {hasDailyClicks ? (
              <ChartContainer
                className="h-[320px] w-full"
                config={{
                  clicks: { color: "var(--primary)", label: "Clicks" },
                }}
              >
                <AreaChart data={dailyClicks}>
                  <defs>
                    <linearGradient
                      id="campaignClickGradient"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
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
                    fill="url(#campaignClickGradient)"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    type="monotone"
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <NoDataPanel
                description="Share campaign links or widen the date range to see a trend."
                title="No clicks in this range"
              />
            )}
          </CardContent>
        </Card>

        <FunnelSection data={data} />
      </div>

      <ComparisonResults comparisons={data.comparisons} />
      <BreakdownSection data={data} />
      <TopLinksTable data={data} />
    </div>
  );
}

export function CampaignAnalyticsClient({
  campaign,
  comparisonCampaigns,
}: CampaignAnalyticsClientProps) {
  const initialRange = useMemo(() => presetDateRange(7), []);
  const [rangeKey, setRangeKey] = useState<RangeKey>("7");
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);
  const [customFrom, setCustomFrom] = useState(initialRange.from);
  const [customTo, setCustomTo] = useState(initialRange.to);
  const [selectedCompareSlugs, setSelectedCompareSlugs] = useState<string[]>([]);
  const [data, setData] = useState<CampaignAnalyticsPayload | null>(null);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  const analyticsUrl = useMemo(() => {
    const params = new URLSearchParams({
      from: dateInputToStartIso(fromDate),
      to: dateInputToEndIso(toDate),
    });

    if (selectedCompareSlugs.length > 0) {
      params.set("compare", selectedCompareSlugs.join(","));
    }

    return `/api/v1/campaigns/${encodeURIComponent(campaign.id)}/analytics?${params.toString()}`;
  }, [campaign.id, fromDate, selectedCompareSlugs, toDate]);

  useEffect(() => {
    const controller = new AbortController();

    fetch(analyticsUrl, { cache: "no-store", signal: controller.signal })
      .then(parseCampaignAnalyticsResponse)
      .then((nextData) => {
        if (controller.signal.aborted) return;
        setError(null);
        setData(nextData);
      })
      .catch((fetchError: unknown) => {
        if (controller.signal.aborted) return;
        setData(null);
        setError({
          message:
            fetchError instanceof Error
              ? fetchError.message
              : "Unable to load campaign analytics.",
          requestId:
            fetchError instanceof CampaignAnalyticsFetchError
              ? fetchError.requestId
              : undefined,
        });
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [analyticsUrl, reloadToken]);

  const csv = data ? buildCampaignCsv(data) : "";
  const csvFilename = `linksnap-campaign-${campaign.slug}-${fromDate}-${toDate}.csv`;
  const exportDisabled = !data || !hasAnalyticsData(data);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Campaign Analytics
          </h2>
          <p className="text-sm text-muted-foreground">
            Review click trends, visitor mix, funnel health, and top links.
          </p>
        </div>
        <div className="flex flex-col gap-2 lg:items-end">
          <RangeControls
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomSubmit={() => {
              setError(null);
              setIsLoading(true);
              setRangeKey("custom");
              setFromDate(customFrom);
              setToDate(customTo);
            }}
            onCustomToChange={setCustomTo}
            onPresetChange={(days) => {
              const nextRange = presetDateRange(days);
              setError(null);
              setIsLoading(true);
              setRangeKey(String(days) as RangeKey);
              setFromDate(nextRange.from);
              setToDate(nextRange.to);
              setCustomFrom(nextRange.from);
              setCustomTo(nextRange.to);
            }}
            rangeKey={rangeKey}
          />
          {exportDisabled ? (
            <Button
              data-testid="campaign-export-csv"
              disabled
              size="sm"
              type="button"
              variant="outline"
            >
              <Download className="size-4" />
              Export CSV
            </Button>
          ) : (
            <Button
              data-testid="campaign-export-csv"
              nativeButton={false}
              render={<a download={csvFilename} href={toCsvDataUri(csv)} />}
              size="sm"
              variant="outline"
            >
              <Download className="size-4" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      <ComparisonSelector
        options={comparisonCampaigns}
        selectedSlugs={selectedCompareSlugs}
        setSelectedSlugs={(slugs) => {
          setError(null);
          setIsLoading(true);
          setSelectedCompareSlugs(slugs);
        }}
      />

      {isLoading && !data ? <LoadingState /> : null}
      {error && !data ? (
        <ErrorState
          message={error.message}
          onRetry={() => {
            setError(null);
            setIsLoading(true);
            setReloadToken((value) => value + 1);
          }}
          requestId={error.requestId}
        />
      ) : null}
      {data ? <AnalyticsContent data={data} /> : null}
    </div>
  );
}
