import { useState } from "react";
import { FlatList, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { ArrowLeft, Copy, KeyRound, Plus, Trash2 } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { HapticPressable } from "@/components/ui/HapticPressable";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { settingsApi } from "@/lib/api/settings";
import { colors } from "@/lib/constants/theme";
import { useApiKeys } from "@/lib/hooks/useSettings";
import type { ApiKey } from "@/types";

export default function ApiKeysScreen(): JSX.Element {
  const [createdKey, setCreatedKey] = useState("");
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const keys = useApiKeys();

  const create = async (): Promise<void> => {
    const result = await settingsApi.createApiKey(name);
    setCreatedKey(result.key);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const renderItem = ({ item }: { item: ApiKey }): JSX.Element => (
    <Card className="gap-3" variant="elevated">
      <View className="flex-row items-center gap-3">
        <KeyRound color={colors.accent.DEFAULT} size={20} />
        <View className="flex-1">
          <Text className="text-body-lg text-content-primary">{item.name}</Text>
          <Text className="text-body text-content-secondary">•••• •••• {item.last4}</Text>
        </View>
        <HapticPressable accessibilityLabel={`Delete ${item.name}`} className="h-11 w-11 items-center justify-center rounded-xl bg-error/10" onPress={() => undefined}>
          <Trash2 color={colors.semantic.error} size={18} />
        </HapticPressable>
      </View>
    </Card>
  );

  return (
    <Screen scroll={false}>
      <View className="flex-row items-center justify-between">
        <Button accessibilityLabel="Back" className="h-11 w-11" icon={ArrowLeft} onPress={() => router.back()} variant="secondary">
          {""}
        </Button>
        <Text className="text-h2 text-content-primary">API Keys</Text>
        <Button accessibilityLabel="Create API key" className="h-11 w-11" icon={Plus} onPress={() => setOpen(true)} variant="secondary">
          {""}
        </Button>
      </View>
      {keys.isLoading ? (
        <Skeleton variant="list" />
      ) : keys.isError ? (
        <ErrorState message="API keys could not be loaded." onRetry={() => void keys.refetch()} />
      ) : (
        <FlatList
          ListEmptyComponent={<EmptyState actionLabel="Create API key" description="Generate keys for server-to-server API access." icon={KeyRound} onAction={() => setOpen(true)} title="No API keys" />}
          className="flex-1"
          contentContainerStyle={{ gap: 12, paddingBottom: 120 }}
          data={keys.data ?? []}
          getItemLayout={(_: unknown, index: number) => ({ index, length: 92, offset: 92 * index })}
          keyExtractor={(item: ApiKey) => item.id}
          renderItem={renderItem}
        />
      )}
      <Sheet onClose={() => setOpen(false)} title="New API Key" visible={open}>
        <View className="gap-4">
          <Input label="Key name" onChangeText={setName} placeholder="Production API" value={name} />
          <Button accessibilityLabel="Generate API key" onPress={create}>
            Generate
          </Button>
          {createdKey ? (
            <Card className="gap-3" variant="accent">
              <Text className="text-body text-content-secondary">This key is shown once.</Text>
              <Text className="text-body-lg text-accent">{createdKey}</Text>
              <Button accessibilityLabel="Copy API key" icon={Copy} onPress={() => Clipboard.setStringAsync(createdKey)} variant="secondary">
                Copy
              </Button>
            </Card>
          ) : null}
        </View>
      </Sheet>
    </Screen>
  );
}
