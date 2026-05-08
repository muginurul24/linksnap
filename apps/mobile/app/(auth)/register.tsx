import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Check, Lock, Mail, User } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { HapticPressable } from "@/components/ui/HapticPressable";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { useAuthStore } from "@/lib/stores/auth-store";
import { emailSchema, passwordScore, passwordSchema } from "@/lib/utils/validation";

const requirements = [
  { label: "8 characters", test: (value: string) => value.length >= 8 },
  { label: "Uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { label: "Number", test: (value: string) => /[0-9]/.test(value) },
  { label: "Special character", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

export default function RegisterScreen(): JSX.Element {
  const auth = useAuthStore();
  const [accepted, setAccepted] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const score = passwordScore(password);
  const completed = useMemo(() => requirements.map((item) => item.test(password)), [password]);

  const submit = async (): Promise<void> => {
    setError("");
    const valid = emailSchema.safeParse(email).success && passwordSchema.safeParse(password).success && password === confirm && accepted;
    if (!valid) {
      setError("Complete every requirement before creating your account.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    try {
      await auth.register({ email, name, password });
      router.replace(`/verify?email=${encodeURIComponent(email)}`);
    } catch {
      setError("Account creation failed. Try again.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior="padding">
        <View className="gap-5">
          <View>
            <Text className="text-h1 text-content-primary">Create account</Text>
            <Text className="text-body text-content-secondary">Start with secure short links and campaign analytics.</Text>
          </View>
          <Card className="gap-4" variant="glass">
            <Input icon={User} label="Name" onChangeText={setName} placeholder="Rafi Link" value={name} />
            <Input icon={Mail} keyboardType="email-address" label="Email" onChangeText={setEmail} placeholder="you@company.com" value={email} />
            <Input icon={Lock} label="Password" onChangeText={setPassword} placeholder="Create password" secureTextEntry value={password} />
            <View className="flex-row gap-2">
              {[1, 2, 3].map((segment) => (
                <View
                  className={`h-2 flex-1 rounded-full ${score >= segment ? (score === 1 ? "bg-error" : score === 2 ? "bg-warning" : "bg-success") : "bg-surface-300"}`}
                  key={segment}
                />
              ))}
            </View>
            <View className="gap-2">
              {requirements.map((item, index) => (
                <View className="flex-row items-center gap-2" key={item.label}>
                  <Check color={completed[index] ? "#22C55E" : "#71717A"} size={16} />
                  <Text className="text-body text-content-secondary">{item.label}</Text>
                </View>
              ))}
            </View>
            <Input icon={Lock} label="Confirm password" onChangeText={setConfirm} placeholder="Repeat password" secureTextEntry value={confirm} />
            <HapticPressable accessibilityLabel="Accept terms" className="flex-row items-center gap-3" onPress={() => setAccepted((value) => !value)}>
              <View className={`h-6 w-6 items-center justify-center rounded-md border ${accepted ? "border-accent bg-accent" : "border-surface-300"}`}>
                {accepted ? <Check color="#09090B" size={16} /> : null}
              </View>
              <Text className="flex-1 text-body text-content-secondary">I agree to the Terms and Privacy Policy.</Text>
            </HapticPressable>
            {error ? <Text className="text-error">{error}</Text> : null}
            <Button accessibilityLabel="Create account" loading={auth.isLoading} onPress={submit}>
              Create Account
            </Button>
          </Card>
          <Button accessibilityLabel="Sign in instead" onPress={() => router.push("/login")} variant="ghost">
            Already have an account? Sign in
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
