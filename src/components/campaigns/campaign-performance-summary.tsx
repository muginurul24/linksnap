type CampaignPerformanceSummaryProps = {
  clicksLast7Days: number;
  linkCount: number;
  totalClicks: number;
};

function formatMetric(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function CampaignPerformanceSummary({
  clicksLast7Days,
  linkCount,
  totalClicks,
}: CampaignPerformanceSummaryProps) {
  const stats = [
    { label: "Total Clicks", value: totalClicks },
    { label: "Links", value: linkCount },
    { label: "7-Day Clicks", value: clicksLast7Days },
  ];

  return (
    <dl
      className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/40 p-3"
      data-testid="campaign-performance-summary"
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
