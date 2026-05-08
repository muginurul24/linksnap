import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Edit3, Plus, Target, Trash2 } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LinkRow } from "@/components/ui/LinkRow";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatsCard } from "@/components/ui/StatsCard";
import { colors } from "@/lib/constants/theme";
import { useCampaign, useCampaignLinks } from "@/lib/hooks/useCampaigns";
import { formatNumber } from "@/lib/utils/format";

export default function CampaignDetailScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const campaign = useCampaign(id);
  const links = useCampaignLinks(id);

  return (
    <Screen>
      <View className="flex-row items-center justify-between">
        <Button accessibilityLabel="Back" className="h-11 w-11" icon={ArrowLeft} onPress={() => router.back()} variant="secondary">
          {""}
        </Button>
        <Button accessibilityLabel="Edit campaign" className="h-11 w-11" icon={Edit3} onPress={() => undefined} variant="secondary">
          {""}
        </Button>
      </View>
      {campaign.isLoading ? (
        <Skeleton variant="detail" />
      ) : campaign.isError || !campaign.data ? (
        <ErrorState message="Campaign details could not be loaded." onRetry={() => void campaign.refetch()} />
      ) : (
        <>
          <Card className="gap-3" variant="glass">
            <Text className="text-h1 text-content-primary">{campaign.data.name}</Text>
            <Text className="text-body text-content-secondary">{campaign.data.description ?? "Campaign workspace"}</Text>
          </Card>
          <View className="flex-row gap-3">
            <StatsCard accentColor={colors.accent.DEFAULT} icon={Target} label="Clicks" value={campaign.data.totalClicks} />
            <StatsCard accentColor={colors.semantic.info} icon={Plus} label="Links" value={campaign.data.linkCount} />
          </View>
          <Card className="gap-3" variant="glass">
            <Text className="text-h3 text-content-primary">UTM Template</Text>
            <Text className="text-body text-content-secondary">source={campaign.data.utm.source ?? "none"}</Text>
            <Text className="text-body text-content-secondary">medium={campaign.data.utm.medium ?? "none"}</Text>
            <Text className="text-body text-content-secondary">campaign={campaign.data.utm.campaign ?? "none"}</Text>
            <Text className="text-label text-accent">Conversion {formatNumber(campaign.data.conversionRate)}%</Text>
          </Card>
          <SectionHeader actionLabel="Add" onAction={() => undefined} title="Links" />
          {links.isLoading ? (
            <Skeleton variant="list" />
          ) : links.isError ? (
            <ErrorState message="Campaign links could not be loaded." onRetry={() => void links.refetch()} />
          ) : (links.data ?? []).length === 0 ? (
            <EmptyState actionLabel="Add links" description="Attach links to aggregate analytics and manage UTM rules." onAction={() => undefined} title="No links in campaign" />
          ) : (
            <View className="gap-3">
              {(links.data ?? []).map((item) => (
                <LinkRow item={item} key={item.id} onPress={(linkId) => router.push(`/link/${linkId}`)} />
              ))}
            </View>
          )}
          <Button accessibilityLabel="Delete campaign" icon={Trash2} onPress={() => undefined} variant="danger">
            Delete Campaign
          </Button>
        </>
      )}
    </Screen>
  );
}
