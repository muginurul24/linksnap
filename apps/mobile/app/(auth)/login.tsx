import { useState } from "react";
import { KeyboardAvoidingView, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Lock, Mail } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { useAuthStore } from "@/lib/stores/auth-store";
import { emailSchema } from "@/lib/utils/validation";

export default function LoginScreen(): JSX.Element {
  const auth = useAuthStore();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (): Promise<void> => {
    setError("");
    const parsedEmail = emailSchema.safeParse(email);
    if (!parsedEmail.success || password.length < 8) {
      setError("Enter a valid email and password.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      const result = await auth.login({ email: parsedEmail.data, password });
      if (result.requiresVerification) router.replace(`/verify?email=${encodeURIComponent(email)}`);
      else router.replace("/");
    } catch {
      setError("Unable to sign in. Check your credentials and try again.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView behavior="padding" className="flex-1 justify-center">
        <View className="gap-6">
          <View className="items-center gap-2">
            <Text className="text-display text-accent">LinkSnap</Text>
            <Text className="text-body text-content-secondary">Smart links for serious growth teams.</Text>
          </View>
          <Card className="gap-4" variant="glass">
            <Input icon={Mail} keyboardType="email-address" label="Email" onChangeText={setEmail} placeholder="you@company.com" value={email} />
            <Input icon={Lock} label="Password" onChangeText={setPassword} placeholder="Enter password" secureTextEntry value={password} />
            <View className="items-end">
              <Button accessibilityLabel="Forgot password" className="h-10 px-0" onPress={() => router.push("/forgot-password")} variant="ghost">
                Forgot password?
              </Button>
            </View>
            {error ? <Text className="text-error">{error}</Text> : null}
            <Button accessibilityLabel="Sign in" loading={auth.isLoading} onPress={submit}>
              Sign In
            </Button>
            <View className="flex-row items-center gap-3 py-2">
              <View className="h-px flex-1 bg-surface-300" />
              <Text className="text-caption text-content-tertiary">or continue with</Text>
              <View className="h-px flex-1 bg-surface-300" />
            </View>
            <Button accessibilityLabel="Continue with Google" onPress={() => setError("Google sign-in opens through the existing web OAuth callback.")} variant="secondary">
              Google
            </Button>
          </Card>
          <Button accessibilityLabel="Create account" onPress={() => router.push("/register")} variant="ghost">
            Create an account
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
