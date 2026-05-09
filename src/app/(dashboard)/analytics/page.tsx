import { redirect } from "next/navigation";
import {
  AlertCircle,
  Calendar,
  Download,
  Link2,
  MousePointerClick,
} from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import {
  DashboardAnalyticsRangeError,
  buildDashboardAnalyticsData,
  getDashboardAnalyticsRetentionDays,
  normalizeDashboardAnalyticsRange,
  type DashboardAnalyticsRange,
  type DashboardAnalyticsRangeKey,
} from "@/lib/analytics/dashboard";
import { analyticsEmptyState } from "@/lib/analytics/empty-state";
import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/auth/session-helpers";
import { getCachedDashboardAnalyticsAggregates } from "@/lib/cache/analytics";
import { getUserPlanById } from "@/lib/db/queries/links";
import { dashboardAnalyticsQuerySchema } from "@/lib/validations/analytics";
import { AnalyticsDashboardClient } from "@/app/(dashboard)/analytics/analytics-dashboard-client";

type AnalyticsPageProps = {
  searchParams: Promise<{
    from?: string | string[];
    range?: string | string[];
    to?: string | string[];
  }>;
};

const RANGE_OPTIONS: Array<{
  href: string;
  key: Exclude<DashboardAnalyticsRangeKey, "custom">;
  days: number;
  label: string;
}> = [
  { days: 7, href: "/analytics?range=7", key: "7", label: "7D" },
  { days: 30, href: "/analytics?range=30", key: "30", label: "30D" },
  { days: 90, href: "/analytics?range=90", key: "90", label: "90D" },
];

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getAnalyticsRange(
  params: Awaited<AnalyticsPageProps["searchParams"]>,
  retentionDays: number,
): { errorMessage?: string; range: DashboardAnalyticsRange } {
  const fallbackRange = normalizeDashboardAnalyticsRange({ range: "30" }, new Date(), {
    retentionDays,
  });
  const parsed = dashboardAnalyticsQuerySchema.safeParse({
    from: firstParam(params.from),
    range: firstParam(params.range),
    to: firstParam(params.to),
  });

  if (!parsed.success) {
    return {
      errorMessage:
        "We could not use that analytics range, so the view was reset to the last 30 days.",
      range: fallbackRange,
    };
  }

  try {
    return {
      range: normalizeDashboardAnalyticsRange(parsed.data, new Date(), {
        retentionDays,
      }),
    };
  } catch (error) {
    const detail =
      error instanceof DashboardAnalyticsRangeError
        ? error.message
        : "The selected range is not available.";

    return {
      errorMessage: `${detail} Showing the last 30 days instead.`,
      range: fallbackRange,
    };
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

function AnalyticsExportButton({
  disabled,
  filename,
  href,
}: {
  disabled: boolean;
  filename: string;
  href: string;
}) {
  if (disabled) {
    return (
      <span
        className="inline-flex"
        title="CSV export is available after this range has analytics data."
      >
        <Button
          aria-disabled="true"
          disabled
          size="sm"
          type="button"
          variant="outline"
        >
          <Download className="size-4" />
          Export CSV
        </Button>
      </span>
    );
  }

  return (
    <Button
      nativeButton={false}
      render={<a download={filename} href={href} />}
      size="sm"
      variant="outline"
    >
      <Download className="size-4" />
      Export CSV
    </Button>
  );
}

function AnalyticsRangeControls({
  errorMessage,
  range,
}: {
  errorMessage?: string;
  range: DashboardAnalyticsRange;
}) {
  return (
    <div className="flex w-full flex-col gap-2 lg:items-end">
      <div
        aria-label="Analytics date range"
        className="grid grid-cols-3 rounded-lg border bg-background p-1 sm:inline-grid sm:w-auto"
        role="group"
      >
        {RANGE_OPTIONS.map((option) => {
          const isAllowed = option.days <= range.maxDays;
          const isActive = range.key === option.key;

          if (!isAllowed) {
            return (
              <span
                className="inline-flex"
                key={option.key}
                title={`Your plan keeps ${range.retentionDays} days of analytics history.`}
              >
                <Button
                  aria-disabled="true"
                  className="w-full justify-center rounded-md"
                  disabled
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <Calendar className="size-4" />
                  {option.label}
                </Button>
              </span>
            );
          }

          return (
            <ButtonLink
              className="justify-center rounded-md"
              href={option.href}
              key={option.key}
              size="sm"
              variant={isActive ? "default" : "ghost"}
            >
              <Calendar className="size-4" />
              {option.label}
            </ButtonLink>
          );
        })}
      </div>
      <form
        action="/analytics"
        className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-[9rem_9rem_auto]"
      >
        <input name="range" type="hidden" value="custom" />
        <Input
          aria-label="Analytics from date"
          className="w-full"
          defaultValue={toDateInputValue(range.from)}
          max={toDateInputValue(range.to)}
          min={toDateInputValue(range.retentionFrom)}
          name="from"
          type="date"
        />
        <Input
          aria-label="Analytics to date"
          className="w-full"
          defaultValue={toDateInputValue(range.to)}
          min={toDateInputValue(range.retentionFrom)}
          name="to"
          type="date"
        />
        <Button className="col-span-2 sm:col-span-1" size="sm" type="submit" variant="outline">
          Apply
        </Button>
      </form>
      {errorMessage ? (
        <p
          className="flex max-w-xl items-start gap-2 text-sm text-amber-700 dark:text-amber-300"
          role="status"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{errorMessage}</span>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Retention starts {toDateInputValue(range.retentionFrom)}.
        </p>
      )}
    </div>
  );
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const session = await auth();
  const userId = getSessionUserId(session);
  if (!userId) redirect("/login?callbackUrl=/analytics");

  const userPlan = await getUserPlanById(userId);
  if (!userPlan) redirect("/login?callbackUrl=/analytics");

  const params = await searchParams;
  const { errorMessage, range } = getAnalyticsRange(
    params,
    getDashboardAnalyticsRetentionDays(userPlan),
  );
  const aggregates = await getCachedDashboardAnalyticsAggregates({
    from: range.from,
    to: range.to,
    userId,
  });
  const analytics = buildDashboardAnalyticsData({ aggregates, range });
  const hasAnalyticsData =
    analytics.summary.totalClicks > 0 ||
    analytics.summary.linkPageAnalytics.pageViews > 0 ||
    analytics.summary.linkPageAnalytics.ctaClicks > 0;

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
          <AnalyticsRangeControls errorMessage={errorMessage} range={range} />
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <ButtonLink href="/links" size="sm" variant="outline">
              <Link2 className="size-4" />
              Manage Links
            </ButtonLink>
            <AnalyticsExportButton
              disabled={!hasAnalyticsData}
              filename={getCsvFilename(range)}
              href={toCsvDataUri(analytics.csv)}
            />
          </div>
        </div>
      </div>

      {!hasAnalyticsData ? (
        <EmptyState
          actionHref={analyticsEmptyState.actionHref}
          actionLabel={analyticsEmptyState.actionLabel}
          description={analyticsEmptyState.description}
          icon={<MousePointerClick className="size-5" />}
          title={analyticsEmptyState.title}
        />
      ) : null}

      <AnalyticsDashboardClient summary={analytics.summary} />
    </>
  );
}
