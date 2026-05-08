import { Text, View } from "react-native";
import Animated, { SlideInUp } from "react-native-reanimated";
import { WifiOff } from "lucide-react-native";
import { colors } from "@/lib/constants/theme";

type OfflineBannerProps = {
  pendingCount: number;
  visible: boolean;
};

export function OfflineBanner({ pendingCount, visible }: OfflineBannerProps): JSX.Element | null {
  if (!visible) return null;

  return (
    <Animated.View className="absolute left-5 right-5 top-3 z-50" entering={SlideInUp.springify().damping(20).stiffness(200)}>
      <View className="flex-row items-center gap-3 rounded-2xl border border-accent/25 bg-surface-50/95 p-4">
        <WifiOff color={colors.accent.DEFAULT} size={20} />
        <Text className="flex-1 text-body text-content-primary">
          Offline mode active{pendingCount > 0 ? ` - ${pendingCount} pending action${pendingCount === 1 ? "" : "s"}` : ""}
        </Text>
      </View>
    </Animated.View>
  );
}
