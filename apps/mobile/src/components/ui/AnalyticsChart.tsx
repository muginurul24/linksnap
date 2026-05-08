import { Text, View } from "react-native";
import { Circle, Defs, LinearGradient, Path, Stop, Svg } from "react-native-svg";
import type { AnalyticsPoint } from "@/types";
import { colors } from "@/lib/constants/theme";
import { Card } from "./Card";

type AnalyticsChartProps = {
  data: AnalyticsPoint[];
};

function buildPath(data: AnalyticsPoint[]): string {
  if (data.length === 0) return "";
  const max = Math.max(...data.map((point) => point.clicks), 1);
  const step = 300 / Math.max(data.length - 1, 1);
  return data
    .map((point, index) => {
      const x = index * step;
      const y = 160 - (point.clicks / max) * 130;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function AnalyticsChart({ data }: AnalyticsChartProps): JSX.Element {
  const path = buildPath(data);
  const lastPoint = data.at(-1);

  return (
    <Card className="gap-4" variant="glass">
      <View className="flex-row items-center justify-between">
        <Text className="text-h3 text-content-primary">Clicks</Text>
        <Text className="text-label text-accent">{lastPoint ? `${lastPoint.clicks} latest` : "No data"}</Text>
      </View>
      <Svg accessibilityLabel="Clicks line chart" height={190} viewBox="-8 0 316 180" width="100%">
        <Defs>
          <LinearGradient id="accentFill" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={colors.accent.DEFAULT} stopOpacity="0.34" />
            <Stop offset="1" stopColor={colors.accent.DEFAULT} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={`${path} L 300 180 L 0 180 Z`} fill="url(#accentFill)" />
        <Path d={path} fill="none" stroke={colors.accent.DEFAULT} strokeLinecap="round" strokeWidth="4" />
        {data.map((point, index) => {
          const max = Math.max(...data.map((item) => item.clicks), 1);
          const x = index * (300 / Math.max(data.length - 1, 1));
          const y = 160 - (point.clicks / max) * 130;
          return <Circle cx={x} cy={y} fill={colors.surface.DEFAULT} key={point.label} r="5" stroke={colors.accent.DEFAULT} strokeWidth="3" />;
        })}
      </Svg>
    </Card>
  );
}
