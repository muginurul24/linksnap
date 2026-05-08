import { Text, View } from "react-native";
import { Image } from "expo-image";
import { cn } from "@/lib/utils/cn";

type AvatarProps = {
  name: string;
  size?: "sm" | "md" | "lg";
  url?: string | null;
};

const sizeClasses = {
  sm: "h-11 w-11",
  md: "h-14 w-14",
  lg: "h-[72px] w-[72px]",
} as const;

export function Avatar({ name, size = "md", url }: AvatarProps): JSX.Element {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <View className={cn("items-center justify-center overflow-hidden rounded-full border-2 border-accent/70 bg-accent/10", sizeClasses[size])}>
      {url ? (
        <Image accessibilityLabel={`${name} avatar`} alt={`${name} avatar`} className="h-full w-full" contentFit="cover" source={{ uri: url }} />
      ) : (
        <Text className="text-base font-bold text-accent">{initials || "LS"}</Text>
      )}
    </View>
  );
}
