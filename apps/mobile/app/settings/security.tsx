import { useState } from "react";
import { Switch, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { ArrowLeft, Lock, QrCode, Shield } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { QRCode } from "@/components/ui/QRCode";
import { Screen } from "@/components/ui/Screen";
import { colors } from "@/lib/constants/theme";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function SecurityScreen(): JSX.Element {
  const [current, setCurrent] = useState("");
  const [enabled2fa, setEnabled2fa] = useState(false);
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const auth = useAuthStore();

  const toggleBiometric = async (value: boolean): Promise<void> => {
    await auth.enableBiometric(value);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <Screen>
      <View className="flex-row items-center justify-between">
        <Button accessibilityLabel="Back" className="h-11 w-11" icon={ArrowLeft} onPress={() => router.back()} variant="secondary">
          {""}
        </Button>
        <Text className="text-h2 text-content-primary">Security</Text>
        <View className="h-11 w-11" />
      </View>
      <Card className="gap-4" variant="glass">
        <Text className="text-h3 text-content-primary">Change password</Text>
        <Input icon={Lock} label="Current password" onChangeText={setCurrent} secureTextEntry value={current} />
        <Input icon={Lock} label="New password" onChangeText={setNext} secureTextEntry value={next} />
        <Input icon={Lock} label="Confirm password" onChangeText={setConfirm} secureTextEntry value={confirm} />
        <Button accessibilityLabel="Update password" disabled={!current || !next || next !== confirm} onPress={() => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}>
          Update Password
        </Button>
      </Card>
      <Card className="gap-4" variant="glass">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <Shield color={colors.accent.DEFAULT} size={22} />
            <Text className="text-body-lg text-content-primary">Biometric unlock</Text>
          </View>
          <Switch accessibilityLabel="Toggle biometric unlock" onValueChange={toggleBiometric} thumbColor={colors.accent.DEFAULT} value={auth.isBiometricEnabled} />
        </View>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <QrCode color={colors.accent.DEFAULT} size={22} />
            <Text className="text-body-lg text-content-primary">Two-factor authentication</Text>
          </View>
          <Switch
            accessibilityLabel="Toggle two-factor authentication"
            onValueChange={(value: boolean) => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setEnabled2fa(value);
            }}
            thumbColor={colors.accent.DEFAULT}
            value={enabled2fa}
          />
        </View>
        {enabled2fa ? <QRCode value="otpauth://totp/LinkSnap:demo?secret=LINKSNAP" /> : null}
      </Card>
    </Screen>
  );
}
