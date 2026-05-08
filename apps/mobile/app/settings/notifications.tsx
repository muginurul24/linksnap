import { Text, View, Switch } from "react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { ArrowLeft, Bell } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Screen } from "@/components/ui/Screen";
import { Skeleton } from "@/components/ui/Skeleton";
import { colors } from "@/lib/constants/theme";
import { sampleNotificationPrefs } from "@/lib/constants/sample-data";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "@/lib/hooks/useSettings";
import type { NotificationPreferences } from "@/types";

function PreferenceRow({ label, onChange, value }: { label: string; onChange: (value: boolean) => void; value: boolean }): JSX.Element {
  return (
    <View className="min-h-14 flex-row items-center justify-between">
      <Text className="text-body-lg text-content-primary">{label}</Text>
      <Switch
        accessibilityLabel={label}
        onValueChange={(next: boolean) => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onChange(next);
        }}
        thumbColor={colors.accent.DEFAULT}
        value={value}
      />
    </View>
  );
}

export default function NotificationsScreen(): JSX.Element {
  const prefs = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();
  const data = prefs.data ?? sampleNotificationPrefs;

  const setPref = (key: keyof NotificationPreferences, value: boolean): void => {
    void update.mutateAsync({ ...data, [key]: value });
  };

  return (
    <Screen>
      <View className="flex-row items-center justify-between">
        <Button accessibilityLabel="Back" className="h-11 w-11" icon={ArrowLeft} onPress={() => router.back()} variant="secondary">
          {""}
        </Button>
        <Text className="text-h2 text-content-primary">Notifications</Text>
        <Bell color={colors.accent.DEFAULT} size={22} />
      </View>
      {prefs.isLoading ? (
        <Skeleton variant="card" />
      ) : prefs.isError ? (
        <ErrorState message="Notification preferences could not be loaded." onRetry={() => void prefs.refetch()} />
      ) : (
        <Card className="gap-2" variant="glass">
          <PreferenceRow label="Click milestones" onChange={(value) => setPref("clickMilestones", value)} value={data.clickMilestones} />
          <PreferenceRow label="Campaign alerts" onChange={(value) => setPref("campaignAlerts", value)} value={data.campaignAlerts} />
          <PreferenceRow label="Billing alerts" onChange={(value) => setPref("billingAlerts", value)} value={data.billingAlerts} />
          <PreferenceRow label="Security alerts" onChange={(value) => setPref("securityAlerts", value)} value={data.securityAlerts} />
        </Card>
      )}
    </Screen>
  );
}
