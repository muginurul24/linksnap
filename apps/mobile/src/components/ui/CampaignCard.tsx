import { memo } from "react";
import { Text, View } from "react-native";
import { Target } from "lucide-react-native";
import type { Campaign } from "@/types";
import { colors } from "@/lib/constants/theme";
import { formatNumber, formatShortDate } from "@/lib/utils/format";
import { Badge } from "./Badge";
import { Card } from "./Card";

type CampaignCardProps = {
  item: Campaign;
  onPress: (id: string) => void;
};

function CampaignCardBase({ item, onPress }: CampaignCardProps): JSX.Element {
  return (
    <Card accessibilityLabel={`Open campaign ${item.name}`} className="gap-4" onPress={() => onPress(item.id)} variant="elevated">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-h3 text-content-primary">{item.name}</Text>
          <Text className="text-body text-content-secondary" numberOfLines={2}>
            {item.description ?? "Campaign workspace"}
          </Text>
        </View>
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-accent/10">
          <Target color={colors.accent.DEFAULT} size={20} />
        </View>
      </View>
      <View className="flex-row flex-wrap gap-2">
        <Badge tone="accent">{`${item.linkCount} links`}</Badge>
        <Badge tone="info">{`${formatNumber(item.totalClicks)} clicks`}</Badge>
        {item.utm.source ? <Badge tone="pending">{`utm:${item.utm.source}`}</Badge> : null}
      </View>
      <Text className="text-caption text-content-tertiary">Created {formatShortDate(item.createdAt)}</Text>
    </Card>
  );
}

export const CampaignCard = memo(CampaignCardBase);
