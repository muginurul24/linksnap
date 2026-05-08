import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Copy, CreditCard } from "lucide-react-native";
import { paymentsApi, type CheckoutResult } from "@/lib/api/payments";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Screen } from "@/components/ui/Screen";
import { Skeleton } from "@/components/ui/Skeleton";

export default function CheckoutScreen(): JSX.Element {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const [data, setData] = useState<CheckoutResult | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async (): Promise<void> => {
      if (!orderId) return;
      try {
        const result = await paymentsApi.transaction(orderId);
        if (!mounted) return;
        setData(result);
        if (result.status === "paid") router.replace("/billing");
      } catch {
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    const id = setInterval(load, 10_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [orderId]);

  const va = data?.vaNumbers?.[0];

  return (
    <Screen>
      <View className="flex-row items-center justify-between">
        <Button accessibilityLabel="Back" className="h-11 w-11" icon={ArrowLeft} onPress={() => router.back()} variant="secondary">
          {""}
        </Button>
        <Text className="text-h2 text-content-primary">Checkout</Text>
        <CreditCard color="#F59E0B" size={22} />
      </View>
      {loading ? (
        <Skeleton variant="billing" />
      ) : error ? (
        <ErrorState message="Payment details could not be loaded." onRetry={() => setError(false)} />
      ) : (
        <Card className="gap-5" variant="glass">
          <View className="gap-2">
            <Text className="text-caption text-content-tertiary">Order</Text>
            <Text className="text-h3 text-content-primary">{data?.orderId ?? orderId}</Text>
            <Badge tone="pending">{data?.status ?? "pending"}</Badge>
          </View>
          <View className="gap-2 rounded-2xl border border-accent/20 bg-accent/10 p-4">
            <Text className="text-caption text-content-tertiary">Virtual Account</Text>
            <Text className="text-h2 text-accent">{va?.bank?.toUpperCase() ?? "BCA"}</Text>
            <Text className="text-display text-content-primary">{va?.vaNumber ?? "Waiting for VA"}</Text>
          </View>
          <Button
            accessibilityLabel="Copy virtual account number"
            disabled={!va?.vaNumber}
            icon={Copy}
            onPress={async () => {
              if (va?.vaNumber) await Clipboard.setStringAsync(va.vaNumber);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }}
            variant="secondary"
          >
            Copy VA Number
          </Button>
          <Text className="text-body text-content-secondary">Complete payment through your bank app. This screen refreshes every 10 seconds and returns to billing after payment is confirmed.</Text>
        </Card>
      )}
    </Screen>
  );
}
