import { router } from "expo-router";
import { AlertCircle } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";

export default function NotFoundScreen(): JSX.Element {
  return (
    <Screen scroll={false}>
      <EmptyState
        actionLabel="Back to dashboard"
        description="The screen you opened is unavailable or has moved."
        icon={AlertCircle}
        onAction={() => router.replace("/")}
        title="Screen not found"
      />
      <Button accessibilityLabel="Go back" onPress={() => router.back()} variant="ghost">
        Go Back
      </Button>
    </Screen>
  );
}
