import { useState } from "react";
import { Share, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Download, Globe, MousePointerClick, TrendingUp } from "lucide-react-native";
import { AnalyticsChart } from "@/components/ui/AnalyticsChart";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { HapticPressable } from "@/components/ui/HapticPressable";
import { Screen } from "@/components/ui/Screen";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatsCard } from "@/components/ui/StatsCard";
import { sampleAnalytics } from "@/lib/constants/sample-data";
import { colors } from "@/lib/constants/theme";
import { useLinkAnalytics } from "@/lib/hooks/useAnalytics";
import { formatNumber } from "@/lib/utils/format";

const ranges = ["7D", "30D", "90D", "All Time"];

export default function AnalyticsScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [range, setRange] = useState("7D");
  const analytics = useLinkAnalytics(id, range);
  const data = analytics.data ?? sampleAnalytics;

  return (
    <Screen>
      <View className="flex-row items-center justify-between">
        <Button accessibilityLabel="Back" className="h-11 w-11" icon={ArrowLeft} onPress={() => router.back()} variant="secondary">
          {""}
        </Button>
        <Text className="text-h2 text-content-primary">Analytics</Text>
        <Button
          accessibilityLabel="Export analytics"
          className="h-11 w-11"
          icon={Download}
          onPress={async () => {
            await Share.share({ message: "LinkSnap analytics CSV export" });
          }}
          variant="secondary"
        >
          {""}
        </Button>
      </View>
      <View className="flex-row gap-2">
        {ranges.map((item) => (
          <HapticPressable
            accessibilityLabel={`Use ${item} range`}
            className={`rounded-full border px-4 py-2 ${range === item ? "border-accent bg-accent" : "border-surface-300 bg-surface-50"}`}
            key={item}
            onPress={() => setRange(item)}
          >
            <Text className={`text-label ${range === item ? "text-content-inverse" : "text-content-secondary"}`}>{item}</Text>
          </HapticPressable>
        ))}
      </View>
      {analytics.isLoading ? (
        <Skeleton variant="chart" />
      ) : analytics.isError ? (
        <ErrorState message="Analytics could not be loaded." onRetry={() => void analytics.refetch()} />
      ) : data.clicks.length === 0 ? (
        <EmptyState
          actionLabel="Share your link"
          description="No clicks yet. Share your link to start collecting analytics."
          onAction={() => {
            void Share.share({ message: "https://linksnap.id" });
          }}
          title="No clicks yet"
        />
      ) : (
        <>
          <AnalyticsChart data={data.clicks} />
          <View className="flex-row flex-wrap gap-3">
            <StatsCard accentColor={colors.accent.DEFAULT} icon={MousePointerClick} label="Total" value={data.totalClicks} />
            <StatsCard accentColor={colors.semantic.success} icon={Globe} label="Unique" value={data.uniqueVisitors} />
            <StatsCard accentColor={colors.semantic.info} icon={TrendingUp} label="Avg CTR" value={`${data.avgCtr}%`} />
            <StatsCard accentColor={colors.semantic.error} label="Bounce" value={`${data.bounceRate}%`} />
          </View>
          <Card className="gap-3" variant="glass">
            <Text className="text-h3 text-content-primary">Top Countries</Text>
            {data.countries.map((item) => (
              <View className="gap-2" key={item.country}>
                <View className="flex-row justify-between">
                  <Text className="text-body-lg text-content-primary">{item.flag} {item.country}</Text>
                  <Text className="text-label text-accent">{formatNumber(item.count)}</Text>
                </View>
                <View className="h-2 rounded-full bg-surface-300">
                  <View className="h-2 rounded-full bg-accent" style={{ width: `${Math.min(100, item.count / 10)}%` }} />
                </View>
              </View>
            ))}
          </Card>
          <Card className="gap-3" variant="glass">
            <Text className="text-h3 text-content-primary">Device Breakdown</Text>
            <View className="flex-row gap-3">
              {data.devices.map((item) => (
                <Card className="flex-1 items-center gap-2 p-3" key={item.device} variant="elevated">
                  <Text className="text-h3 text-accent">{item.percentage}%</Text>
                  <Text className="text-caption text-content-tertiary">{item.device}</Text>
                </Card>
              ))}
            </View>
          </Card>
          <Card className="gap-3" variant="glass">
            <Text className="text-h3 text-content-primary">Top Referrers</Text>
            {data.referrers.map((item) => (
              <View className="flex-row items-center justify-between" key={item.source}>
                <Text className="text-body-lg text-content-primary">{item.source}</Text>
                <Badge tone="accent">{formatNumber(item.count)}</Badge>
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}
