import { Text, View } from "react-native";
import { cn } from "@/lib/utils/cn";

type BadgeProps = {
  children: string;
  className?: string;
  tone?: "active" | "pending" | "error" | "accent" | "info";
};

const toneClasses = {
  active: { root: "bg-success/15 border-success/25", text: "text-success" },
  pending: { root: "bg-warning/15 border-warning/25", text: "text-warning" },
  error: { root: "bg-error/15 border-error/25", text: "text-error" },
  accent: { root: "bg-accent/15 border-accent/25", text: "text-accent" },
  info: { root: "bg-info/15 border-info/25", text: "text-info" },
} as const;

export function Badge({ children, className, tone = "accent" }: BadgeProps): JSX.Element {
  const classes = toneClasses[tone];
  return (
    <View className={cn("rounded-full border px-3 py-1", classes.root, className)}>
      <Text className={cn("text-xs font-semibold uppercase", classes.text)}>{children}</Text>
    </View>
  );
}
