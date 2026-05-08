import { FlatList, Text, View } from "react-native";
import { router } from "expo-router";
import { ArrowLeft, FileText } from "lucide-react-native";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Screen } from "@/components/ui/Screen";
import { Skeleton } from "@/components/ui/Skeleton";
import { sampleHistory } from "@/lib/constants/sample-data";
import { usePaymentHistory } from "@/lib/hooks/usePayments";
import type { PaymentHistoryItem } from "@/types";

export default function BillingHistoryScreen(): JSX.Element {
  const history = usePaymentHistory();
  const renderItem = ({ item }: { item: PaymentHistoryItem }): JSX.Element => (
    <Card className="flex-row items-center justify-between" variant="glass">
      <View>
        <Text className="text-body-lg text-content-primary">{item.amount}</Text>
        <Text className="text-caption text-content-tertiary">{item.date}</Text>
      </View>
      <Badge tone={item.status === "Paid" ? "active" : item.status === "Pending" ? "pending" : "error"}>{item.status}</Badge>
    </Card>
  );

  return (
    <Screen scroll={false}>
      <View className="flex-row items-center justify-between">
        <Button accessibilityLabel="Back" className="h-11 w-11" icon={ArrowLeft} onPress={() => router.back()} variant="secondary">
          {""}
        </Button>
        <Text className="text-h2 text-content-primary">Invoices</Text>
        <View className="h-11 w-11" />
      </View>
      {history.isLoading ? (
        <Skeleton variant="list" />
      ) : history.isError ? (
        <ErrorState message="Invoices could not be loaded." onRetry={() => void history.refetch()} />
      ) : (
        <FlatList
          ListEmptyComponent={<EmptyState description="Paid invoices and pending transactions appear here." icon={FileText} title="No invoices" />}
          className="flex-1"
          contentContainerStyle={{ gap: 12, paddingBottom: 120 }}
          data={history.data ?? sampleHistory}
          getItemLayout={(_: unknown, index: number) => ({ index, length: 92, offset: 92 * index })}
          keyExtractor={(item: PaymentHistoryItem) => item.id}
          renderItem={renderItem}
        />
      )}
    </Screen>
  );
}
