import { useState } from "react";
import { Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { ArrowLeft, Mail } from "lucide-react-native";
import { authApi } from "@/lib/api/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";

export default function ForgotPasswordScreen(): JSX.Element {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (): Promise<void> => {
    await authApi.forgotPassword(email);
    setSent(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <Screen>
      <View className="flex-row items-center justify-between">
        <Button accessibilityLabel="Back" className="h-11 w-11" icon={ArrowLeft} onPress={() => router.back()} variant="secondary">
          {""}
        </Button>
        <Text className="text-h2 text-content-primary">Reset Password</Text>
        <View className="h-11 w-11" />
      </View>
      <Card className="gap-4" variant="glass">
        <Input icon={Mail} keyboardType="email-address" label="Email" onChangeText={setEmail} placeholder="you@company.com" value={email} />
        {sent ? <Text className="text-body text-success">Reset instructions sent.</Text> : null}
        <Button accessibilityLabel="Send reset email" onPress={submit}>
          Send Reset Email
        </Button>
      </Card>
    </Screen>
  );
}
