import { redirect } from "next/navigation";
import { Calendar, Download, MousePointerClick } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import {
  buildDashboardAnalyticsData,
  normalizeDashboardAnalyticsRange,
  type DashboardAnalyticsRange,
  type DashboardAnalyticsRangeKey,
} from "@/lib/analytics/dashboard";
import { analyticsEmptyState } from "@/lib/analytics/empty-state";
import { auth } from "@/lib/auth";
import { listClickEventsForUser } from "@/lib/db/queries/click-events";
import { dashboardAnalyticsQuerySchema } from "@/lib/validations/analytics";
import { AnalyticsDashboardClient } from "./analytics-dashboard-client";

type AnalyticsPageProps = {
  searchParams: Promise<{
    from?: string | string[];
    range?: string | string[];
    to?: string | string[];
  }>;
};

type SessionWithUserId = {
  user?: {
    id?: unknown;
  } | null;
} | null;

const RANGE_OPTIONS: Array<{
  href: string;
  key: Exclude<DashboardAnalyticsRangeKey, "custom">;
  label: string;
}> = [
  { href: "/analytics?range=7", key: "7", label: "Last 7 Days" },
  { href: "/analytics?range=30", key: "30", label: "Last 30 Days" },
  { href: "/analytics?range=90", key: "90", label: "Last 90 Days" },
];

function getSessionUserId(session: SessionWithUserId): string | null {
  return typeof session?.user?.id === "string" ? session.user.id : null;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getAnalyticsRange(
  params: Awaited<AnalyticsPageProps["searchParams"]>,
): DashboardAnalyticsRange {
  const parsed = dashboardAnalyticsQuerySchema.safeParse({
    from: firstParam(params.from),
    range: firstParam(params.range),
    to: firstParam(params.to),
  });

  if (!parsed.success) {
    return normalizeDashboardAnalyticsRange({ range: "30" });
  }

  try {
    return normalizeDashboardAnalyticsRange(parsed.data);
  } catch {
    return normalizeDashboardAnalyticsRange({ range: "30" });
  }
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toCsvDataUri(csv: string): string {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
}

function getCsvFilename(range: DashboardAnalyticsRange): string {
  return `linksnap-analytics-${toDateInputValue(range.from)}-${toDateInputValue(
    range.to,
  )}.csv`;
}

function AnalyticsRangeControls({ range }: { range: DashboardAnalyticsRange }) {
  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        {RANGE_OPTIONS.map((option) => (
          <ButtonLink
            href={option.href}
            key={option.key}
            size="sm"
            variant={range.key === option.key ? "default" : "outline"}
          >
            <Calendar className="size-4" />
            {option.label}
          </ButtonLink>
        ))}
      </div>
      <form action="/analytics" className="flex flex-wrap items-center gap-2">
        <input name="range" type="hidden" value="custom" />
        <Input
          aria-label="Analytics from date"
          className="w-36"
          defaultValue={toDateInputValue(range.from)}
          name="from"
          type="date"
        />
        <Input
          aria-label="Analytics to date"
          className="w-36"
          defaultValue={toDateInputValue(range.to)}
          name="to"
          type="date"
        />
        <Button size="sm" type="submit" variant="outline">
          Apply
        </Button>
      </form>
    </div>
  );
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const session = await auth();
  const userId = getSessionUserId(session);
  if (!userId) redirect("/login?callbackUrl=/analytics");

  const params = await searchParams;
  const range = getAnalyticsRange(params);
  const events = await listClickEventsForUser({
    from: range.from,
    to: range.to,
    userId,
  });
  const analytics = buildDashboardAnalyticsData({ events, range });
  const hasClicks = analytics.summary.totalClicks > 0;

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Deep dive into your link performance data.
          </p>
        </div>
        <div className="flex flex-col gap-2 lg:items-end">
          <AnalyticsRangeControls range={range} />
          <Button
            render={
              <a
                download={getCsvFilename(range)}
                href={toCsvDataUri(analytics.csv)}
              />
            }
            size="sm"
            variant="outline"
          >
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {!hasClicks ? (
        <EmptyState
          actionHref={analyticsEmptyState.actionHref}
          actionLabel={analyticsEmptyState.actionLabel}
          description={analyticsEmptyState.description}
          icon={<MousePointerClick className="size-5" />}
          title={analyticsEmptyState.title}
        />
      ) : (
        <AnalyticsDashboardClient summary={analytics.summary} />
      )}
    </>
  );
}
