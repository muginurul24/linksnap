import { Text, View } from "react-native";
import { AlertCircle } from "lucide-react-native";
import { colors } from "@/lib/constants/theme";
import { Button } from "./Button";
import { Card } from "./Card";

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps): JSX.Element {
  return (
    <Card className="items-center gap-4" variant="glass">
      <View className="h-14 w-14 items-center justify-center rounded-2xl bg-error/10">
        <AlertCircle color={colors.semantic.error} size={28} />
      </View>
      <Text className="text-center text-body text-content-secondary">{message}</Text>
      {onRetry ? (
        <Button accessibilityLabel="Retry" className="w-full" onPress={onRetry} variant="secondary">
          Retry
        </Button>
      ) : null}
    </Card>
  );
}
