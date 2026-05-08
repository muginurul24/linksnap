import { Text, View } from "react-native";
import { router } from "expo-router";
import { Bell, ChevronRight, HelpCircle, KeyRound, Lock, LogOut, Settings, Shield, Trash2, User } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { HapticPressable } from "@/components/ui/HapticPressable";
import { Screen } from "@/components/ui/Screen";
import { Skeleton } from "@/components/ui/Skeleton";
import { colors } from "@/lib/constants/theme";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useProfile } from "@/lib/hooks/useSettings";

type SettingsRowProps = {
  danger?: boolean;
  icon: typeof User;
  label: string;
  onPress: () => void;
  right?: string;
};

function SettingsRow({ danger = false, icon: Icon, label, onPress, right }: SettingsRowProps): JSX.Element {
  return (
    <HapticPressable accessibilityLabel={label} className="min-h-14 flex-row items-center gap-3 py-2" onPress={onPress}>
      <View className={`h-10 w-10 items-center justify-center rounded-xl ${danger ? "bg-error/10" : "bg-surface-200"}`}>
        <Icon color={danger ? colors.semantic.error : colors.content.secondary} size={19} />
      </View>
      <Text className={`flex-1 text-body-lg ${danger ? "text-error" : "text-content-primary"}`}>{label}</Text>
      {right ? <Badge tone="accent">{right}</Badge> : <ChevronRight color={colors.content.tertiary} size={18} />}
    </HapticPressable>
  );
}

export default function SettingsScreen(): JSX.Element {
  const profile = useProfile();
  const auth = useAuthStore();
  const user = profile.data ?? auth.user;

  return (
    <Screen>
      <Text className="text-h1 text-content-primary">Settings</Text>
      {profile.isLoading ? (
        <Skeleton variant="card" />
      ) : profile.isError || !user ? (
        <ErrorState message="Profile could not be loaded." onRetry={() => void profile.refetch()} />
      ) : (
        <Card className="items-center gap-3" variant="glass">
          <Avatar name={user.name} size="lg" url={user.avatarUrl} />
          <View className="items-center gap-1">
            <Text className="text-h2 text-content-primary">{user.name}</Text>
            <Text className="text-body text-content-secondary">{user.email}</Text>
          </View>
          <Badge tone="accent">{user.plan}</Badge>
        </Card>
      )}

      <Card className="gap-1" variant="glass">
        <Text className="text-caption text-content-tertiary">Account</Text>
        <SettingsRow icon={User} label="Edit Profile" onPress={() => router.push("/settings/profile")} />
        <SettingsRow icon={Lock} label="Change Password" onPress={() => router.push("/settings/security")} />
        <SettingsRow icon={Shield} label="Two-Factor Auth" onPress={() => router.push("/settings/security")} />
      </Card>

      <Card className="gap-1" variant="glass">
        <Text className="text-caption text-content-tertiary">Preferences</Text>
        <SettingsRow icon={Bell} label="Notifications" onPress={() => router.push("/settings/notifications")} />
        <SettingsRow icon={Settings} label="Appearance" onPress={() => undefined} right="Dark" />
        <SettingsRow icon={Settings} label="Haptics" onPress={() => undefined} right="On" />
      </Card>

      <Card className="gap-1" variant="glass">
        <Text className="text-caption text-content-tertiary">Developer</Text>
        <SettingsRow icon={KeyRound} label="API Keys" onPress={() => router.push("/settings/api-keys")} right="3" />
      </Card>

      <Card className="gap-1" variant="glass">
        <Text className="text-caption text-content-tertiary">Support</Text>
        <SettingsRow icon={HelpCircle} label="Help Center" onPress={() => undefined} />
        <SettingsRow icon={HelpCircle} label="Contact Support" onPress={() => undefined} />
        <SettingsRow icon={Shield} label="Privacy Policy" onPress={() => undefined} />
      </Card>

      <Card className="gap-1 border-error/25" variant="glass">
        <Text className="text-caption text-error">Danger Zone</Text>
        <SettingsRow danger icon={Trash2} label="Delete Account" onPress={() => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)} />
      </Card>

      <Button accessibilityLabel="Log out" icon={LogOut} onPress={() => void auth.logout()} variant="ghost">
        Logout
      </Button>
    </Screen>
  );
}
