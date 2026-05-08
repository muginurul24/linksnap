import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { cn } from "@/lib/utils/cn";

type SkeletonProps = {
  className?: string;
  variant?: "line" | "card" | "stats" | "list" | "chart" | "detail" | "billing";
};

function ShimmerBlock({ className }: { className: string }): JSX.Element {
  const offset = useSharedValue(-1);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!reduceMotion) {
      // eslint-disable-next-line react-hooks/immutability
      offset.value = withRepeat(withTiming(1, { duration: 1100 }), -1, false);
    }
  }, [offset, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 0.55 : 0.45 + Math.abs(Number(offset.value)) * 0.18,
  }));

  return <Animated.View className={cn("overflow-hidden rounded-xl bg-surface-300/70", className)} style={animatedStyle} />;
}

export function Skeleton({ className, variant = "card" }: SkeletonProps): JSX.Element {
  if (variant === "stats") {
    return (
      <View className={cn("flex-row gap-3", className)}>
        {[0, 1, 2].map((item) => (
          <View className="w-36 rounded-2xl border border-surface-300/50 bg-surface-50/80 p-5" key={item}>
            <ShimmerBlock className="h-8 w-20" />
            <ShimmerBlock className="mt-3 h-3 w-24" />
          </View>
        ))}
      </View>
    );
  }

  if (variant === "list") {
    return (
      <View className={cn("gap-3", className)}>
        {[0, 1, 2, 3, 4].map((item) => (
          <View className="rounded-2xl border border-surface-300/50 bg-surface-50/80 p-5" key={item}>
            <View className="flex-row items-center gap-3">
              <ShimmerBlock className="h-11 w-11 rounded-full" />
              <View className="flex-1 gap-2">
                <ShimmerBlock className="h-4 w-32" />
                <ShimmerBlock className="h-3 w-full" />
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (variant === "chart") {
    return (
      <View className={cn("rounded-2xl border border-surface-300/50 bg-surface-50/80 p-5", className)}>
        <ShimmerBlock className="h-5 w-32" />
        <ShimmerBlock className="mt-5 h-48 w-full rounded-2xl" />
      </View>
    );
  }

  if (variant === "billing" || variant === "detail") {
    return (
      <View className={cn("gap-4", className)}>
        <ShimmerBlock className="h-36 w-full rounded-2xl" />
        <View className="flex-row gap-3">
          <ShimmerBlock className="h-24 flex-1 rounded-2xl" />
          <ShimmerBlock className="h-24 flex-1 rounded-2xl" />
        </View>
        <ShimmerBlock className="h-40 w-full rounded-2xl" />
      </View>
    );
  }

  return <ShimmerBlock className={cn("h-28 w-full rounded-2xl", className)} />;
}
