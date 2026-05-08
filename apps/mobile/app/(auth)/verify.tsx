import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Mail } from "lucide-react-native";
import { authApi } from "@/lib/api/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { colors } from "@/lib/constants/theme";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function VerifyScreen(): JSX.Element {
  const params = useLocalSearchParams<{ email?: string; token?: string }>();
  const auth = useAuthStore();
  const [code, setCode] = useState<string[]>(() =>
    typeof params.token === "string" && params.token.length === 6 ? params.token.split("") : Array.from({ length: 6 }, () => ""),
  );
  const [countdown, setCountdown] = useState(60);
  const [error, setError] = useState("");
  const email = params.email ?? "";

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  const verify = async (nextCode = code): Promise<void> => {
    const otp = nextCode.join("");
    if (otp.length !== 6) return;
    try {
      await auth.verifyEmail({ email, otp });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => router.replace("/"), 500);
    } catch {
      setError("That code is invalid or expired.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const paste = async (): Promise<void> => {
    const value = (await Clipboard.getStringAsync()).replace(/\D/g, "").slice(0, 6);
    if (value.length === 6) {
      const next = value.split("");
      setCode(next);
      await verify(next);
    }
  };

  const resend = async (): Promise<void> => {
    await authApi.resendOtp(email);
    setCountdown(60);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <Screen scroll={false}>
      <Animated.View className="flex-1 justify-center gap-6" entering={FadeInUp.springify().damping(15).stiffness(150)}>
        <Card className="items-center gap-5 py-8" variant="glass">
          <View className="h-20 w-20 items-center justify-center rounded-3xl bg-accent/10">
            <Mail color={colors.accent.DEFAULT} size={42} />
          </View>
          <View className="items-center gap-2">
            <Text className="text-h1 text-content-primary">Check your email</Text>
            <Text className="text-center text-body text-content-secondary">We sent a 6-digit code to {email || "your inbox"}.</Text>
          </View>
          <View className="flex-row gap-2">
            {code.map((digit, index) => (
              <TextInput
                accessibilityLabel={`OTP digit ${index + 1}`}
                className="h-12 w-11 rounded-xl border border-surface-300 bg-surface-200 text-center text-xl font-bold text-content-primary"
                keyboardType="number-pad"
                key={`${index}-${digit}`}
                maxLength={1}
                onChangeText={(value: string) => {
                  const next = [...code];
                  next[index] = value.replace(/\D/g, "").slice(0, 1);
                  setCode(next);
                  void verify(next);
                }}
                value={digit}
              />
            ))}
          </View>
          {error ? <Text className="text-error">{error}</Text> : null}
          <Button accessibilityLabel="Paste verification code" onPress={paste} variant="secondary">
            Paste Code
          </Button>
          <Button accessibilityLabel="Resend verification code" disabled={countdown > 0} onPress={resend} variant="ghost">
            {countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}
          </Button>
        </Card>
      </Animated.View>
    </Screen>
  );
}
