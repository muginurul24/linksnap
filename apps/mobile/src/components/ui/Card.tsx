import type { ReactNode } from "react";
import { View } from "react-native";
import { cn } from "@/lib/utils/cn";
import { HapticPressable } from "./HapticPressable";

type CardProps = {
  children: ReactNode;
  className?: string;
  variant?: "glass" | "elevated" | "accent";
  onPress?: () => void | Promise<void>;
  accessibilityLabel?: string;
  style?: Record<string, unknown>;
};

const variants = {
  glass: "bg-surface-50/80 border border-surface-300/50 rounded-2xl p-5",
  elevated: "bg-surface-50 border border-surface-200 rounded-2xl p-5 active:opacity-80",
  accent: "bg-accent/10 border border-accent/20 rounded-2xl p-5",
} as const;

export function Card({
  children,
  className,
  variant = "glass",
  onPress,
  accessibilityLabel = "Card",
  style,
}: CardProps): JSX.Element {
  const classes = cn(variants[variant], className);

  if (onPress) {
    return (
      <HapticPressable accessibilityLabel={accessibilityLabel} className={classes} onPress={onPress} style={style}>
        {children}
      </HapticPressable>
    );
  }

  return (
    <View className={classes} style={style}>
      {children}
    </View>
  );
}
