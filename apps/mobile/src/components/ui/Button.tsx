import type { ReactNode } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { colors } from "@/lib/constants/theme";
import { cn } from "@/lib/utils/cn";
import { HapticPressable } from "./HapticPressable";

type ButtonProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  icon?: LucideIcon;
  loading?: boolean;
  onPress?: () => void | Promise<void>;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  accessibilityLabel?: string;
};

const rootClasses = {
  primary: "bg-accent h-14 rounded-xl items-center justify-center",
  secondary: "h-14 rounded-xl items-center justify-center border border-surface-300 active:bg-surface-100",
  ghost: "h-12 px-4 rounded-xl items-center justify-center active:bg-surface-100",
  danger: "bg-error h-14 rounded-xl items-center justify-center",
} as const;

const textClasses = {
  primary: "text-content-inverse font-semibold text-base",
  secondary: "text-content-primary font-semibold text-base",
  ghost: "text-accent font-semibold text-base",
  danger: "text-content-primary font-semibold text-base",
} as const;

export function Button({
  children,
  className,
  disabled = false,
  icon: Icon,
  loading = false,
  onPress,
  variant = "primary",
  accessibilityLabel,
}: ButtonProps): JSX.Element {
  const isDisabled = disabled || loading;
  const iconColor = variant === "primary" ? colors.content.inverse : variant === "ghost" ? colors.accent.DEFAULT : colors.content.primary;

  return (
    <HapticPressable
      accessibilityLabel={accessibilityLabel ?? String(children)}
      className={cn(rootClasses[variant], isDisabled && "opacity-60", className)}
      disabled={isDisabled}
      onPress={onPress}
    >
      <View className="flex-row items-center justify-center gap-2">
        {loading ? <ActivityIndicator color={iconColor} /> : Icon ? <Icon color={iconColor} size={18} /> : null}
        <Text className={textClasses[variant]}>{children}</Text>
      </View>
    </HapticPressable>
  );
}
