import type { ReactNode } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "@/lib/utils/cn";

type ScreenProps = {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  scroll?: boolean;
  title?: string;
};

export function Screen({ children, className, onRefresh, padded = true, refreshing = false, scroll = true, title }: ScreenProps): JSX.Element {
  const insets = useSafeAreaInsets();
  const content = (
    <View
      className={cn("mx-auto w-full max-w-[480px] gap-5", padded && "px-5", className)}
     
      style={{ paddingTop: insets.top + 12 }}
    >
      {title ? <Text className="text-h1 text-content-primary">{title}</Text> : null}
      {children}
    </View>
  );

  return (
    <View className="flex-1 bg-surface">
      <Stack.Screen options={{ headerShown: false }} />
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} tintColor="#F59E0B" onRefresh={onRefresh} /> : undefined}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        <View className="flex-1" style={{ paddingBottom: insets.bottom }}>
          {content}
        </View>
      )}
    </View>
  );
}
