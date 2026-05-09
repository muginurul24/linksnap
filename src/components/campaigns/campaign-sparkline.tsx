"use client";

import { Line, LineChart } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import type { CampaignClickTrendPoint } from "@/lib/db/queries/campaigns";

type CampaignSparklineProps = {
  data: CampaignClickTrendPoint[];
};

function hasTrendData(data: CampaignClickTrendPoint[]): boolean {
  return data.some((point) => point.totalClicks > 0);
}

export function CampaignSparkline({ data }: CampaignSparklineProps) {
  if (!hasTrendData(data)) {
    return (
      <div
        className="flex h-10 items-center justify-center rounded-md border border-dashed bg-muted/25 text-xs text-muted-foreground"
        data-testid="campaign-sparkline-empty"
      >
        No activity
      </div>
    );
  }

  const chartData = data.map((point) => ({
    clicks: point.totalClicks,
    date: point.date,
  }));

  return (
    <ChartContainer
      className="h-10 w-full"
      config={{ clicks: { color: "var(--chart-2)", label: "Clicks" } }}
      data-testid="campaign-sparkline"
      initialDimension={{ height: 40, width: 240 }}
    >
      <LineChart data={chartData} margin={{ bottom: 4, left: 4, right: 4, top: 4 }}>
        <Line
          dataKey="clicks"
          dot={false}
          isAnimationActive={false}
          stroke="var(--chart-2)"
          strokeWidth={2}
          type="monotone"
        />
      </LineChart>
    </ChartContainer>
  );
}
