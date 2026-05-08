import { Text, View } from "react-native";
import { Button } from "./Button";

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps): JSX.Element {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-h3 text-content-primary">{title}</Text>
      {actionLabel && onAction ? (
        <Button accessibilityLabel={actionLabel} className="h-11 px-3" onPress={onAction} variant="ghost">
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}
