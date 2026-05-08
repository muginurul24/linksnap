import type { ReactNode } from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { Home, Link, Plus, Settings, Target } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/lib/constants/theme";
import { HapticPressable } from "@/components/ui/HapticPressable";

function TabButton({ children, label, onPress }: { children?: ReactNode; label: string; onPress?: () => void }): JSX.Element {
  return (
    <HapticPressable accessibilityLabel={label} className="min-h-11 flex-1 items-center justify-center" onPress={onPress}>
      {children}
    </HapticPressable>
  );
}

export default function TabLayout(): JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent.DEFAULT,
        tabBarBackground: () => (
          <BlurView className="absolute inset-0 overflow-hidden rounded-2xl border border-surface-300/50" intensity={80} tint="dark" />
        ),
        tabBarButton: (props: { children?: ReactNode; onPress?: () => void }) => (
          <TabButton label="Open tab" onPress={props.onPress}>
            {props.children}
          </TabButton>
        ),
        tabBarInactiveTintColor: colors.content.tertiary,
        tabBarLabelStyle: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 11,
          marginTop: 4,
        },
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopWidth: 0,
          bottom: insets.bottom + 8,
          elevation: 0,
          height: 64,
          left: 16,
          position: "absolute",
          right: 16,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color }: { color: string }) => <Home color={color} size={22} /> }} />
      <Tabs.Screen name="links" options={{ title: "Links", tabBarIcon: ({ color }: { color: string }) => <Link color={color} size={22} /> }} />
      <Tabs.Screen
        name="create"
        options={{
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <View className={`-mt-6 h-12 w-12 items-center justify-center rounded-2xl ${focused ? "bg-accent" : "bg-accent/80"}`}>
              <Plus color={colors.content.inverse} size={24} />
            </View>
          ),
          tabBarLabel: () => null,
          title: "Create",
        }}
      />
      <Tabs.Screen name="campaigns" options={{ title: "Campaigns", tabBarIcon: ({ color }: { color: string }) => <Target color={color} size={22} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color }: { color: string }) => <Settings color={color} size={22} /> }} />
    </Tabs>
  );
}
