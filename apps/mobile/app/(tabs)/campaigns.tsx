import { useState } from "react";
import { FlatList, Text, View } from "react-native";
import { router } from "expo-router";
import { Plus, Target } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { CampaignCard } from "@/components/ui/CampaignCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCampaigns, useCreateCampaign } from "@/lib/hooks/useCampaigns";
import type { Campaign } from "@/types";

export default function CampaignsScreen(): JSX.Element {
  const [createOpen, setCreateOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [utmSource, setUtmSource] = useState("");
  const campaigns = useCampaigns();
  const create = useCreateCampaign();

  const submit = async (): Promise<void> => {
    await create.mutateAsync({ description, name, utmCampaign: name.toLowerCase().replace(/\s+/g, "_"), utmMedium: "social", utmSource });
    setCreateOpen(false);
  };

  const renderItem = ({ item }: { item: Campaign }): JSX.Element => <CampaignCard item={item} onPress={(id) => router.push(`/campaign/${id}`)} />;

  return (
    <Screen scroll={false}>
      <View className="flex-row items-center justify-between">
        <Text className="text-h1 text-content-primary">Campaigns</Text>
        <Button accessibilityLabel="Create campaign" className="h-11 w-11" icon={Plus} onPress={() => setCreateOpen(true)} variant="secondary">
          {""}
        </Button>
      </View>
      {campaigns.isLoading ? (
        <Skeleton variant="list" />
      ) : campaigns.isError ? (
        <ErrorState message="Campaigns could not be loaded." onRetry={() => void campaigns.refetch()} />
      ) : (
        <FlatList
          ListEmptyComponent={<EmptyState actionLabel="Create campaign" description="Group links, apply UTM templates, and compare performance." icon={Target} onAction={() => setCreateOpen(true)} title="No campaigns yet" />}
          className="flex-1"
          contentContainerStyle={{ gap: 12, paddingBottom: 120 }}
          data={campaigns.data ?? []}
          getItemLayout={(_: unknown, index: number) => ({ index, length: 156, offset: 156 * index })}
          keyExtractor={(item: Campaign) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}
      <Sheet onClose={() => setCreateOpen(false)} title="Create Campaign" visible={createOpen}>
        <View className="gap-4">
          <Input label="Name" onChangeText={setName} placeholder="Ramadhan Sale" value={name} />
          <Input label="Description" multiline onChangeText={setDescription} placeholder="Campaign notes" value={description} />
          <Input label="UTM source" onChangeText={setUtmSource} placeholder="instagram" value={utmSource} />
          <Button accessibilityLabel="Create campaign" loading={create.isPending} onPress={submit}>
            Create Campaign
          </Button>
        </View>
      </Sheet>
    </Screen>
  );
}
