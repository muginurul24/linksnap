import { memo } from "react";
import { Text, View } from "react-native";
import { Link as LinkIcon } from "lucide-react-native";
import type { LinkItem } from "@/types";
import { colors } from "@/lib/constants/theme";
import { formatNumber, formatTimeAgo } from "@/lib/utils/format";
import { Badge } from "./Badge";
import { Card } from "./Card";

type LinkRowProps = {
  item: LinkItem;
  onPress: (id: string) => void;
};

function LinkRowBase({ item, onPress }: LinkRowProps): JSX.Element {
  return (
    <Card accessibilityLabel={`Open ${item.slug}`} className="gap-3" onPress={() => onPress(item.id)} variant="elevated">
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-accent/10">
          <LinkIcon color={colors.accent.DEFAULT} size={20} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-base font-semibold text-content-primary">linksnap.id/{item.slug}</Text>
          <Text className="text-body text-content-secondary" numberOfLines={1}>
            {item.destinationUrl}
          </Text>
        </View>
        <Badge tone={item.isActive ? "active" : "pending"}>{item.isActive ? "Active" : "Paused"}</Badge>
      </View>
      <View className="flex-row items-center justify-between">
        <Text className="text-caption text-content-tertiary">{formatTimeAgo(item.createdAt)}</Text>
        <Text className="text-label text-accent">{formatNumber(item.clicksToday)} today</Text>
      </View>
    </Card>
  );
}

export const LinkRow = memo(LinkRowBase);
