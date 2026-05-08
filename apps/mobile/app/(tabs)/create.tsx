import { useState } from "react";
import { Share, Switch, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import { Check, Clipboard as ClipboardIcon, Link as LinkIcon, Plus } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LinkRow } from "@/components/ui/LinkRow";
import { QRScanner } from "@/components/ui/QRScanner";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { sampleLinks } from "@/lib/constants/sample-data";
import { colors } from "@/lib/constants/theme";
import { useAppStore } from "@/lib/stores/app-store";
import { useCreateLink } from "@/lib/hooks/useLinks";
import { isValidUrl } from "@/lib/utils/validation";

export default function CreateScreen(): JSX.Element {
  const params = useLocalSearchParams<{ scan?: string; url?: string }>();
  const [advanced, setAdvanced] = useState(false);
  const [customSlug, setCustomSlug] = useState("");
  const [hasLinkPage, setHasLinkPage] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(() => params.scan === "true");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState(() => params.url ?? "");
  const [created, setCreated] = useState("");
  const createLink = useCreateLink();
  const pendingCount = useAppStore((state) => state.pendingMutations.length);
  const valid = isValidUrl(url);

  const paste = async (): Promise<void> => {
    const value = await Clipboard.getStringAsync();
    setUrl(value);
  };

  const copy = async (): Promise<void> => {
    if (!created) return;
    await Clipboard.setStringAsync(`https://linksnap.id/${created}`);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const submit = async (): Promise<void> => {
    if (!valid) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    const result = await createLink.mutateAsync({ customSlug, destinationUrl: url, hasLinkPage, title });
    setCreated(result.slug);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Share.share({ message: `https://linksnap.id/${result.slug}` });
  };

  return (
    <Screen title="Quick Create">
      <Card className="gap-4" variant="glass">
        <Input icon={LinkIcon} label="Paste a long URL" onChangeText={setUrl} placeholder="https://example.com" value={url} />
        <View className="flex-row items-center gap-2">
          {valid ? <Check color={colors.semantic.success} size={18} /> : null}
          <Text className="text-body text-content-secondary">{valid ? "URL validated" : "Paste a valid HTTP or HTTPS URL"}</Text>
        </View>
        <View className="flex-row gap-3">
          <Button accessibilityLabel="Paste from clipboard" className="flex-1" icon={ClipboardIcon} onPress={paste} variant="secondary">
            Paste
          </Button>
          <Button accessibilityLabel="Open QR scanner" className="flex-1" onPress={() => setScannerVisible(true)} variant="secondary">
            Scan
          </Button>
        </View>
      </Card>

      <Card className="gap-3" variant="accent">
        <Text className="text-label text-content-secondary">Short link preview</Text>
        <Text className="text-h2 text-accent">linksnap.id/{created || customSlug || "auto-slug"}</Text>
        <Button accessibilityLabel="Copy generated short link" disabled={!created} icon={Check} onPress={copy} variant="secondary">
          Copy
        </Button>
      </Card>

      <Card accessibilityLabel="Toggle optional fields" className="gap-4" onPress={() => setAdvanced((value) => !value)} variant="elevated">
        <View className="flex-row items-center justify-between">
          <Text className="text-h3 text-content-primary">Optional fields</Text>
          <Plus color={colors.accent.DEFAULT} size={18} />
        </View>
        {advanced ? (
          <View className="gap-4">
            <Input label="Custom slug" onChangeText={setCustomSlug} placeholder="ramadhan-sale" value={customSlug} />
            <Input label="Title" onChangeText={setTitle} placeholder="Campaign title" value={title} />
            <View className="flex-row items-center justify-between rounded-xl border border-surface-300 bg-surface-200 p-4">
              <Text className="text-body-lg text-content-primary">Enable Link Page</Text>
              <Switch
                accessibilityLabel="Enable Link Page"
                onValueChange={(value: boolean) => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setHasLinkPage(value);
                }}
                thumbColor={colors.accent.DEFAULT}
                value={hasLinkPage}
              />
            </View>
          </View>
        ) : null}
      </Card>

      <Button accessibilityLabel="Shorten and share" disabled={!valid} loading={createLink.isPending} onPress={submit}>
        Shorten & Share
      </Button>
      {pendingCount > 0 ? <Text className="text-caption text-accent">{pendingCount} pending offline actions</Text> : null}

      <SectionHeader title="Recent Links" />
      <View className="gap-3">
        {sampleLinks.slice(0, 3).map((item) => (
          <LinkRow item={item} key={item.id} onPress={() => undefined} />
        ))}
      </View>
      <QRScanner onClose={() => setScannerVisible(false)} visible={scannerVisible} />
    </Screen>
  );
}
