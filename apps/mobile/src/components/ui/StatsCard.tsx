import { memo } from "react";
import { Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { colors } from "@/lib/constants/theme";
import { formatNumber } from "@/lib/utils/format";
import { Card } from "./Card";

type StatsCardProps = {
  accentColor?: string;
  icon?: LucideIcon;
  label: string;
  value: number | string | undefined;
};

function StatsCardBase({ accentColor = colors.accent.DEFAULT, icon: Icon, label, value }: StatsCardProps): JSX.Element {
  return (
    <Card className="min-w-36 flex-1 gap-3 border-l-4" style={{ borderLeftColor: accentColor }} variant="glass">
      <View className="flex-row items-center justify-between">
        <Text className="text-caption text-content-tertiary">{label}</Text>
        {Icon ? <Icon color={accentColor} size={18} /> : null}
      </View>
      <Text className="text-display text-content-primary">{typeof value === "number" ? formatNumber(value) : value ?? "0"}</Text>
    </Card>
  );
}

export const StatsCard = memo(StatsCardBase);
