import { useState } from "react";
import { Switch, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Plus, Trash2 } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { HapticPressable } from "@/components/ui/HapticPressable";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Skeleton } from "@/components/ui/Skeleton";
import { colors } from "@/lib/constants/theme";
import { useLink, useUpdateLink } from "@/lib/hooks/useLinks";

const accentColors = ["#F59E0B", "#3B82F6", "#22C55E", "#EF4444"];
const themes = ["Auto", "Dark", "Light"];

export default function EditLinkScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const link = useLink(id);
  const update = useUpdateLink(String(id));
  const [ctaColor, setCtaColor] = useState("#F59E0B");
  const [destination, setDestination] = useState("");
  const [linkPage, setLinkPage] = useState(false);
  const [rulesEnabled, setRulesEnabled] = useState(false);
  const [slug, setSlug] = useState("");
  const [theme, setTheme] = useState("Auto");
  const [title, setTitle] = useState("");

  const data = link.data;

  const save = async (): Promise<void> => {
    await update.mutateAsync({
      destinationUrl: destination || data?.destinationUrl || "",
      hasLinkPage: linkPage,
      title: title || data?.title || "",
      customSlug: slug || data?.slug || "",
    });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <Screen>
      <View className="flex-row items-center justify-between">
        <Button accessibilityLabel="Back" className="h-11 w-11" icon={ArrowLeft} onPress={() => router.back()} variant="secondary">
          {""}
        </Button>
        <Text className="text-h2 text-content-primary">Edit Link</Text>
        <View className="h-11 w-11" />
      </View>
      {link.isLoading ? (
        <Skeleton variant="detail" />
      ) : link.isError || !data ? (
        <ErrorState message="Link could not be loaded." onRetry={() => void link.refetch()} />
      ) : (
        <>
          <Card className="gap-4" variant="glass">
            <Text className="text-h3 text-content-primary">Basic Info</Text>
            <Input label="Slug" onChangeText={setSlug} placeholder={data.slug} value={slug} />
            <Input label="Destination URL" onChangeText={setDestination} placeholder={data.destinationUrl} value={destination} />
            <Input label="Title" onChangeText={setTitle} placeholder={data.title ?? "Optional title"} value={title} />
          </Card>
          <Card className="gap-4" variant="glass">
            <View className="flex-row items-center justify-between">
              <Text className="text-h3 text-content-primary">Link Page</Text>
              <Switch
                accessibilityLabel="Toggle Link Page"
                onValueChange={(value: boolean) => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setLinkPage(value);
                }}
                thumbColor={colors.accent.DEFAULT}
                value={linkPage}
              />
            </View>
            {linkPage ? (
              <View className="gap-4">
                <Input label="Brand name" placeholder="LinkSnap" />
                <Input label="Page title" placeholder="Limited offer" />
                <Input label="Description" multiline placeholder="Short page description" />
                <Input label="CTA text" placeholder="Continue" />
                <View className="flex-row gap-3">
                  {accentColors.map((color) => (
                    <HapticPressable
                      accessibilityLabel={`Select ${color}`}
                      className={`h-10 w-10 rounded-full border-2 ${ctaColor === color ? "border-content-primary" : "border-transparent"}`}
                      key={color}
                      onPress={() => setCtaColor(color)}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </View>
                <View className="flex-row rounded-xl border border-surface-300 bg-surface-100 p-1">
                  {themes.map((item) => (
                    <HapticPressable accessibilityLabel={`Use ${item} theme`} className={`flex-1 rounded-lg py-3 ${theme === item ? "bg-accent" : ""}`} key={item} onPress={() => setTheme(item)}>
                      <Text className={`text-center text-label ${theme === item ? "text-content-inverse" : "text-content-secondary"}`}>{item}</Text>
                    </HapticPressable>
                  ))}
                </View>
                <Card className="gap-2" variant="accent">
                  <Text className="text-h3 text-content-primary">Live Preview</Text>
                  <Text className="text-body text-content-secondary">Your branded Link Page preview updates as you edit.</Text>
                </Card>
              </View>
            ) : null}
          </Card>
          <Card className="gap-4" variant="glass">
            <View className="flex-row items-center justify-between">
              <Text className="text-h3 text-content-primary">Smart Rules</Text>
              <Switch
                accessibilityLabel="Toggle smart rules"
                onValueChange={(value: boolean) => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setRulesEnabled(value);
                }}
                thumbColor={colors.accent.DEFAULT}
                value={rulesEnabled}
              />
            </View>
            {rulesEnabled ? (
              <View className="gap-3">
                <Button accessibilityLabel="Add smart rule" icon={Plus} onPress={() => undefined} variant="secondary">
                  Add Rule
                </Button>
                <Card className="gap-3" variant="elevated">
                  <Text className="text-body-lg text-content-primary">Country equals Indonesia</Text>
                  <Input label="Redirect URL" placeholder="https://example.com/id" />
                  <Button accessibilityLabel="Delete rule" icon={Trash2} onPress={() => undefined} variant="danger">
                    Delete Rule
                  </Button>
                </Card>
              </View>
            ) : null}
          </Card>
        </>
      )}
      <Button accessibilityLabel="Save link" loading={update.isPending} onPress={save}>
        Save Link
      </Button>
    </Screen>
  );
}
