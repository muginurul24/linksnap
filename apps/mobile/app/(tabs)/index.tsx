import { Text, View } from "react-native";
import { router } from "expo-router";
import { Link as LinkIcon, MousePointerClick, Plus, QrCode, Target } from "lucide-react-native";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { HapticPressable } from "@/components/ui/HapticPressable";
import { LinkRow } from "@/components/ui/LinkRow";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatsCard } from "@/components/ui/StatsCard";
import { sampleDashboard } from "@/lib/constants/sample-data";
import { colors } from "@/lib/constants/theme";
import { useDashboardOverview } from "@/lib/hooks/useDashboard";
import { formatFullDate, greetingForNow } from "@/lib/utils/format";

export default function DashboardScreen(): JSX.Element {
  const dashboard = useDashboardOverview();
  const data = dashboard.data ?? sampleDashboard;

  return (
    <Screen onRefresh={() => void dashboard.refetch()} refreshing={dashboard.isFetching}>
      <View className="flex-row items-center justify-between gap-4">
        <View className="flex-1">
          <Text className="text-h1 text-content-primary">
            {greetingForNow()}, {data.user.name.split(" ")[0]} 👋
          </Text>
          <Text className="text-body text-content-secondary">{formatFullDate(new Date())}</Text>
        </View>
        <HapticPressable accessibilityLabel="Open settings" className="h-[72px] w-[72px] rounded-full" onPress={() => router.push("/settings")}>
          <Avatar name={data.user.name} size="lg" url={data.user.avatarUrl} />
        </HapticPressable>
      </View>

      {dashboard.isLoading ? (
        <Skeleton variant="stats" />
      ) : dashboard.isError ? (
        <ErrorState message="Dashboard stats could not be loaded." onRetry={() => void dashboard.refetch()} />
      ) : (
        <View className="flex-row gap-3">
          <StatsCard accentColor={colors.accent.DEFAULT} icon={LinkIcon} label="Links" value={data.stats.links} />
          <StatsCard accentColor={colors.semantic.success} icon={MousePointerClick} label="Clicks Today" value={data.stats.clicksToday} />
          <StatsCard accentColor={colors.semantic.info} icon={Target} label="Campaigns" value={data.stats.activeCampaigns} />
        </View>
      )}

      <View className="grid gap-3">
        <View className="flex-row gap-3">
          <Card accessibilityLabel="Create link" className="flex-1 gap-3" onPress={() => router.push("/create")} variant="elevated">
            <Plus color={colors.accent.DEFAULT} size={22} />
            <Text className="text-h3 text-content-primary">Create Link</Text>
          </Card>
          <Card accessibilityLabel="Scan QR" className="flex-1 gap-3" onPress={() => router.push("/create?scan=true")} variant="elevated">
            <QrCode color={colors.accent.DEFAULT} size={22} />
            <Text className="text-h3 text-content-primary">Scan QR</Text>
          </Card>
        </View>
        <View className="flex-row gap-3">
          <Card accessibilityLabel="My links" className="flex-1 gap-3" onPress={() => router.push("/links")} variant="elevated">
            <LinkIcon color={colors.accent.DEFAULT} size={22} />
            <Text className="text-h3 text-content-primary">My Links</Text>
          </Card>
          <Card accessibilityLabel="Campaigns" className="flex-1 gap-3" onPress={() => router.push("/campaigns")} variant="elevated">
            <Target color={colors.accent.DEFAULT} size={22} />
            <Text className="text-h3 text-content-primary">Campaigns</Text>
          </Card>
        </View>
      </View>

      {data.subscription.plan === "FREE" ? (
        <Card accessibilityLabel="Upgrade to Pro" className="gap-3" onPress={() => router.push("/billing")} variant="accent">
          <Text className="text-h3 text-accent">Upgrade to Pro</Text>
          <Text className="text-body text-content-secondary">Unlock higher limits, advanced analytics, API access, and premium Link Pages.</Text>
          <Button accessibilityLabel="Open billing" onPress={() => router.push("/billing")}>
            View Plans
          </Button>
        </Card>
      ) : null}

      <SectionHeader actionLabel="View All" onAction={() => router.push("/links")} title="Recent Links" />
      {dashboard.isLoading ? (
        <Skeleton variant="list" />
      ) : data.recentLinks.length === 0 ? (
        <EmptyState actionLabel="Create your first link" description="Shorten a URL and track every click from one dashboard." onAction={() => router.push("/create")} title="No links yet" />
      ) : (
        <View className="gap-3">
          {data.recentLinks.slice(0, 5).map((item) => (
            <LinkRow item={item} key={item.id} onPress={(id) => router.push(`/link/${id}`)} />
          ))}
        </View>
      )}
    </Screen>
  );
}
