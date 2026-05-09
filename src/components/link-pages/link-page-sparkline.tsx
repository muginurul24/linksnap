"use client";

import { Line, LineChart } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import type { LinkPageTrendPoint } from "@/lib/db/queries/links";

type LinkPageSparklineProps = {
  data: LinkPageTrendPoint[];
};

export function LinkPageSparkline({ data }: LinkPageSparklineProps) {
  if (!data.some((point) => point.pageViews > 0)) {
    return (
      <div
        className="flex h-10 items-center justify-center rounded-md border border-dashed bg-muted/25 text-xs text-muted-foreground"
        data-testid="link-page-sparkline-empty"
      >
        No views
      </div>
    );
  }

  const chartData = data.map((point) => ({
    date: point.date,
    views: point.pageViews,
  }));

  return (
    <ChartContainer
      className="h-10 w-full"
      config={{ views: { color: "var(--chart-1)", label: "Page views" } }}
      data-testid="link-page-sparkline"
      initialDimension={{ height: 40, width: 240 }}
    >
      <LineChart data={chartData} margin={{ bottom: 4, left: 4, right: 4, top: 4 }}>
        <Line
          dataKey="views"
          dot={false}
          isAnimationActive={false}
          stroke="var(--chart-1)"
          strokeWidth={2}
          type="monotone"
        />
      </LineChart>
    </ChartContainer>
  );
}
