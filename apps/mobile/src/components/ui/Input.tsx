import { useState } from "react";
import * as Haptics from "expo-haptics";
import { Text, TextInput, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { colors } from "@/lib/constants/theme";
import { cn } from "@/lib/utils/cn";

type InputProps = {
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  className?: string;
  error?: string;
  icon?: LucideIcon;
  keyboardType?: string;
  label?: string;
  multiline?: boolean;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  value?: string;
};

export function Input({
  autoCapitalize = "none",
  className,
  error,
  icon: Icon,
  keyboardType,
  label,
  multiline = false,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  value,
}: InputProps): JSX.Element {
  const [focused, setFocused] = useState(false);

  return (
    <View className={cn("gap-2", className)}>
      {label ? <Text className="text-label text-content-secondary">{label}</Text> : null}
      <View
        className={cn(
          "bg-surface-200 border border-surface-300 rounded-xl px-4 flex-row items-center gap-3",
          multiline ? "min-h-28 py-3 items-start" : "h-14",
          focused && "border-accent/50",
          error && "border-error/70",
        )}
      >
        {Icon ? <Icon color={colors.content.tertiary} size={20} /> : null}
        <TextInput
          accessibilityLabel={label ?? placeholder}
          autoCapitalize={autoCapitalize}
          className="flex-1 text-content-primary text-base"
          keyboardType={keyboardType}
          multiline={multiline}
          onBlur={() => setFocused(false)}
          onChangeText={onChangeText}
          onFocus={() => {
            setFocused(true);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.content.tertiary}
          secureTextEntry={secureTextEntry}
          textAlignVertical={multiline ? "top" : "center"}
          value={value}
        />
      </View>
      {error ? <Text className="text-error text-sm">{error}</Text> : null}
    </View>
  );
}
