import { useMemo, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { router } from "expo-router";
import { Filter, Search, SlidersHorizontal, Trash2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { HapticPressable } from "@/components/ui/HapticPressable";
import { Input } from "@/components/ui/Input";
import { LinkRow } from "@/components/ui/LinkRow";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { colors } from "@/lib/constants/theme";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { useLinks } from "@/lib/hooks/useLinks";
import type { LinkItem } from "@/types";

const filters = ["All", "Active", "With Pages", "By Campaign"];
const sorts = ["Newest", "Most Clicked", "Alphabetical"];

export default function LinksScreen(): JSX.Element {
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("Newest");
  const [sortOpen, setSortOpen] = useState(false);
  const debounced = useDebounce(query, 300);
  const links = useLinks({ filter, search: debounced, sort });
  const data = useMemo(() => links.data ?? [], [links.data]);

  const renderItem = ({ item }: { item: LinkItem }): JSX.Element => (
    <View className="gap-2">
      <LinkRow item={item} onPress={(id) => router.push(`/link/${id}`)} />
      <HapticPressable
        accessibilityLabel={`Delete ${item.slug}`}
        className="self-end flex-row items-center gap-2 rounded-xl bg-error/15 px-4 py-2"
        hapticStyle={Haptics.ImpactFeedbackStyle.Medium}
        onPress={() => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)}
      >
        <Trash2 color={colors.semantic.error} size={16} />
        <Text className="text-label text-error">Delete</Text>
      </HapticPressable>
    </View>
  );

  return (
    <Screen scroll={false}>
      <View className="flex-row items-center justify-between">
        <Text className="text-h1 text-content-primary">My Links</Text>
        <Button accessibilityLabel="Open sort and filter" className="h-11 w-11" icon={SlidersHorizontal} onPress={() => setSortOpen(true)} variant="secondary">
          {""}
        </Button>
      </View>
      <Input icon={Search} onChangeText={setQuery} placeholder="Search links" value={query} />
      <View className="flex-row gap-2">
        {filters.map((item) => (
          <HapticPressable
            accessibilityLabel={`Filter ${item}`}
            className={`rounded-full border px-4 py-2 ${filter === item ? "border-accent bg-accent" : "border-surface-300 bg-surface-50"}`}
            key={item}
            onPress={() => setFilter(item)}
          >
            <Text className={`text-label ${filter === item ? "text-content-inverse" : "text-content-secondary"}`}>{item}</Text>
          </HapticPressable>
        ))}
      </View>
      {links.isLoading ? (
        <Skeleton variant="list" />
      ) : links.isError ? (
        <ErrorState message="Links could not be loaded." onRetry={() => void links.refetch()} />
      ) : (
        <FlatList
          ListEmptyComponent={
            <EmptyState actionLabel="Create your first link" description="Your links will appear here with click stats and quick actions." icon={Filter} onAction={() => router.push("/create")} title="No matching links" />
          }
          className="flex-1"
          contentContainerStyle={{ gap: 12, paddingBottom: 120 }}
          data={data}
          getItemLayout={(_: unknown, index: number) => ({ index, length: 132, offset: 132 * index })}
          keyExtractor={(item: LinkItem) => item.id}
          onEndReached={() => undefined}
          onEndReachedThreshold={0.6}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}
      <Sheet onClose={() => setSortOpen(false)} title="Sort Links" visible={sortOpen}>
        <View className="gap-3">
          {sorts.map((item) => (
            <HapticPressable
              accessibilityLabel={`Sort by ${item}`}
              className={`rounded-xl border p-4 ${sort === item ? "border-accent bg-accent/10" : "border-surface-300 bg-surface-50"}`}
              key={item}
              onPress={() => setSort(item)}
            >
              <Text className="text-body-lg text-content-primary">{item}</Text>
            </HapticPressable>
          ))}
          <Button accessibilityLabel="Apply sort" onPress={() => setSortOpen(false)}>
            Apply
          </Button>
        </View>
      </Sheet>
    </Screen>
  );
}
