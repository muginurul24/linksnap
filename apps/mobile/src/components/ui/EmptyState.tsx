import { Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { Sparkles } from "lucide-react-native";
import { colors } from "@/lib/constants/theme";
import { Button } from "./Button";
import { Card } from "./Card";

type EmptyStateProps = {
  actionLabel?: string;
  description: string;
  icon?: LucideIcon;
  onAction?: () => void;
  title: string;
};

export function EmptyState({ actionLabel, description, icon: Icon = Sparkles, onAction, title }: EmptyStateProps): JSX.Element {
  return (
    <Card className="items-center gap-4 py-8" variant="glass">
      <View accessibilityLabel={title} className="h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
        <Icon color={colors.accent.DEFAULT} size={32} />
      </View>
      <View className="items-center gap-2">
        <Text className="text-h3 text-center text-content-primary">{title}</Text>
        <Text className="max-w-[280px] text-center text-body text-content-secondary">{description}</Text>
      </View>
      {actionLabel && onAction ? (
        <Button accessibilityLabel={actionLabel} className="mt-2 w-full" onPress={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </Card>
  );
}
