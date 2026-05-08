import { useState } from "react";
import { Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { CheckCircle2, Clipboard as ClipboardIcon, Link as LinkIcon } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { colors } from "@/lib/constants/theme";
import { useCreateLink } from "@/lib/hooks/useLinks";
import { isValidUrl } from "@/lib/utils/validation";

type QuickCreateProps = {
  initialUrl?: string;
};

export function QuickCreate({ initialUrl = "" }: QuickCreateProps): JSX.Element {
  const [url, setUrl] = useState(initialUrl);
  const [createdSlug, setCreatedSlug] = useState("");
  const createLink = useCreateLink();
  const valid = isValidUrl(url);

  const paste = async (): Promise<void> => {
    const value = await Clipboard.getStringAsync();
    setUrl(value);
  };

  const submit = async (): Promise<void> => {
    if (!valid) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    const result = await createLink.mutateAsync({ destinationUrl: url });
    setCreatedSlug(result.slug);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <Card className="gap-4" variant="glass">
      <Input icon={LinkIcon} label="Destination URL" onChangeText={setUrl} placeholder="https://example.com/product" value={url} />
      <View className="flex-row gap-3">
        <Button accessibilityLabel="Paste URL" className="flex-1" icon={ClipboardIcon} onPress={paste} variant="secondary">
          Paste
        </Button>
        <Button accessibilityLabel="Shorten and share" className="flex-[1.4]" disabled={!valid} loading={createLink.isPending} onPress={submit}>
          Shorten
        </Button>
      </View>
      {valid ? (
        <View className="flex-row items-center gap-2">
          <CheckCircle2 color={colors.semantic.success} size={18} />
          <Text className="text-body text-content-secondary">Valid URL ready for shortening</Text>
        </View>
      ) : null}
      {createdSlug ? (
        <View className="rounded-xl border border-accent/20 bg-accent/10 p-4">
          <Text className="text-label text-content-secondary">Preview</Text>
          <Text className="text-h3 text-accent">linksnap.id/{createdSlug}</Text>
        </View>
      ) : null}
    </Card>
  );
}
