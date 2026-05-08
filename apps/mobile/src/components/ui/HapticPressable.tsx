import type { ReactNode } from "react";
import * as Haptics from "expo-haptics";
import { Pressable } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";

type HapticPressableProps = {
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  hapticStyle?: Haptics.ImpactFeedbackStyle;
  onPress?: (event: unknown) => void | Promise<void>;
  onLongPress?: (event: unknown) => void | Promise<void>;
  accessibilityLabel: string;
  accessibilityRole?: string;
} & Record<string, unknown>;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function HapticPressable({
  children,
  className,
  disabled = false,
  hapticStyle = Haptics.ImpactFeedbackStyle.Light,
  onPress,
  onLongPress,
  accessibilityLabel,
  accessibilityRole = "button",
  ...props
}: HapticPressableProps): JSX.Element {
  const scale = useSharedValue(1);
  const reduceMotion = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pressIn = (): void => {
    if (!disabled && !reduceMotion) {
      // eslint-disable-next-line react-hooks/immutability
      scale.value = withSpring(0.97, { damping: 20, stiffness: 260 });
    }
  };

  const pressOut = (): void => {
    if (!reduceMotion) {
      // eslint-disable-next-line react-hooks/immutability
      scale.value = withSpring(1, { damping: 16, stiffness: 220 });
    }
  };

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
    <AnimatedPressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      className={className}
      disabled={disabled}
      onLongPress={handleLongPress}
      onPress={handlePress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={animatedStyle}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
