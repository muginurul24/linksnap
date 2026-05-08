import type { ReactNode } from "react";
import * as Haptics from "expo-haptics";
import { Pressable } from "react-native";

type HapticPressableProps = {
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  hapticStyle?: Haptics.ImpactFeedbackStyle;
  onPress?: (event: unknown) => void | Promise<void>;
  onLongPress?: (event: unknown) => void | Promise<void>;
  accessibilityLabel: string;
  accessibilityRole?: string;
  style?: Record<string, unknown>;
} & Record<string, unknown>;

export function HapticPressable({
  children,
  className,
  disabled = false,
  hapticStyle = Haptics.ImpactFeedbackStyle.Light,
  onPress,
  onLongPress,
  accessibilityLabel,
  accessibilityRole = "button",
  style,
  ...props
}: HapticPressableProps): JSX.Element {
  const handlePress = async (event: unknown): Promise<void> => {
    if (disabled) return;
    await Haptics.impactAsync(hapticStyle);
    await onPress?.(event);
  };

  const handleLongPress = async (event: unknown): Promise<void> => {
    if (disabled) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await onLongPress?.(event);
  };

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      className={className}
      disabled={disabled}
      onLongPress={handleLongPress}
      onPress={handlePress}
      style={({ pressed }) => [pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }, style]}
      {...props}
    >
      {children}
    </Pressable>
  );
}
