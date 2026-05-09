type LinkPagePerformanceSummaryProps = {
  ctaClicks: number;
  pageViews: number;
  pageViewsLast7Days: number;
};

function formatMetric(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatCtr(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(value);
}

export function LinkPagePerformanceSummary({
  ctaClicks,
  pageViews,
  pageViewsLast7Days,
}: LinkPagePerformanceSummaryProps) {
  const stats = [
    { label: "Page Views", value: pageViews },
    { label: "CTA Clicks", value: ctaClicks },
    { label: "7-Day Views", value: pageViewsLast7Days },
  ];

  return (
    <dl
      className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/40 p-3"
      data-testid="link-page-performance-summary"
    >
      {stats.map((stat) => (
        <div className="min-w-0" key={stat.label}>
          <dt className="truncate text-xs text-muted-foreground">{stat.label}</dt>
          <dd className="text-lg font-bold tabular-nums">
            {formatMetric(stat.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
