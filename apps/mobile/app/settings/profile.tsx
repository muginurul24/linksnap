import { useState } from "react";
import { Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { ArrowLeft, Camera, Mail, User } from "lucide-react-native";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { useProfile, useUpdateProfile } from "@/lib/hooks/useSettings";

export default function ProfileScreen(): JSX.Element {
  const profile = useProfile();
  const update = useUpdateProfile();
  const [email, setEmail] = useState(profile.data?.email ?? "");
  const [name, setName] = useState(profile.data?.name ?? "");

  const submit = async (): Promise<void> => {
    await update.mutateAsync({ email, name });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <Screen>
      <View className="flex-row items-center justify-between">
        <Button accessibilityLabel="Back" className="h-11 w-11" icon={ArrowLeft} onPress={() => router.back()} variant="secondary">
          {""}
        </Button>
        <Text className="text-h2 text-content-primary">Edit Profile</Text>
        <View className="h-11 w-11" />
      </View>
      <Card className="items-center gap-4" variant="glass">
        <Avatar name={name || "LinkSnap"} size="lg" url={profile.data?.avatarUrl} />
        <Button accessibilityLabel="Change avatar" icon={Camera} onPress={() => undefined} variant="secondary">
          Change Avatar
        </Button>
      </Card>
      <Card className="gap-4" variant="glass">
        <Input icon={User} label="Name" onChangeText={setName} value={name} />
        <Input icon={Mail} keyboardType="email-address" label="Email" onChangeText={setEmail} value={email} />
      </Card>
      <Button accessibilityLabel="Save profile" loading={update.isPending} onPress={submit}>
        Save Profile
      </Button>
    </Screen>
  );
}
