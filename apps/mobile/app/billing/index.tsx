import { useState } from "react";
import { FlatList, Text, View } from "react-native";
import { router } from "expo-router";
import { ArrowLeft, Check, CreditCard, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { HapticPressable } from "@/components/ui/HapticPressable";
import { Screen } from "@/components/ui/Screen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { sampleHistory, sampleSubscription } from "@/lib/constants/sample-data";
import { useCheckout, usePaymentHistory, useSubscription } from "@/lib/hooks/usePayments";
import type { PaymentHistoryItem, Plan } from "@/types";

const plans: Array<{ features: string[]; name: Plan; price: number; tag?: string }> = [
  { features: ["25 links", "3 Link Pages", "Basic analytics"], name: "FREE", price: 0 },
  { features: ["500 links", "50 Link Pages", "API access", "Advanced analytics"], name: "PRO", price: 8, tag: "Popular" },
  { features: ["Unlimited links", "Webhooks", "365-day retention", "Priority support"], name: "BUSINESS", price: 19, tag: "Best Value" },
];

export default function BillingScreen(): JSX.Element {
  const [duration, setDuration] = useState<"monthly" | "yearly">("monthly");
  const [cancelOpen, setCancelOpen] = useState(false);
  const subscription = useSubscription();
  const history = usePaymentHistory();
  const checkout = useCheckout();
  const current = subscription.data ?? sampleSubscription;

  const choosePlan = async (plan: Plan): Promise<void> => {
    if (plan === "FREE") return;
    const result = await checkout.mutateAsync({ duration, plan });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push(`/billing/checkout?orderId=${encodeURIComponent(result.orderId)}`);
  };

  const renderHistory = ({ item }: { item: PaymentHistoryItem }): JSX.Element => (
    <Card accessibilityLabel={`Invoice ${item.id}`} className="flex-row items-center justify-between" onPress={() => router.push("/billing/history")} variant="elevated">
      <View>
        <Text className="text-body-lg text-content-primary">{item.amount}</Text>
        <Text className="text-caption text-content-tertiary">{item.date}</Text>
      </View>
      <Badge tone={item.status === "Paid" ? "active" : item.status === "Pending" ? "pending" : "error"}>{item.status}</Badge>
    </Card>
  );

  return (
    <Screen>
      <View className="flex-row items-center justify-between">
        <Button accessibilityLabel="Close billing" className="h-11 w-11" icon={ArrowLeft} onPress={() => router.back()} variant="secondary">
          {""}
        </Button>
        <Text className="text-h2 text-content-primary">Billing</Text>
        <View className="h-11 w-11" />
      </View>

      {subscription.isLoading ? (
        <Skeleton variant="billing" />
      ) : subscription.isError ? (
        <ErrorState message="Subscription could not be loaded." onRetry={() => void subscription.refetch()} />
      ) : (
        <Card className="gap-3" variant="accent">
          <Text className="text-h1 text-accent">{current.plan}</Text>
          <Badge tone="active">{current.status}</Badge>
          <Text className="text-body text-content-secondary">
            {current.nextBillingDate ? `Next billing: ${current.nextBillingDate}` : "Upgrade to unlock premium features."}
          </Text>
        </Card>
      )}

      <View className="flex-row rounded-xl border border-surface-300 bg-surface-100 p-1">
        {(["monthly", "yearly"] as const).map((item) => (
          <HapticPressable
            accessibilityLabel={`Use ${item} billing`}
            className={`flex-1 rounded-lg py-3 ${duration === item ? "bg-accent" : ""}`}
            key={item}
            onPress={() => setDuration(item)}
          >
            <Text className={`text-center text-label ${duration === item ? "text-content-inverse" : "text-content-secondary"}`}>
              {item === "yearly" ? "Yearly -20%" : "Monthly"}
            </Text>
          </HapticPressable>
        ))}
      </View>

      <View className="gap-3">
        {plans.map((plan) => (
          <Card
            accessibilityLabel={`Choose ${plan.name}`}
            className={`gap-4 ${plan.name === "PRO" ? "border-accent" : ""}`}
            key={plan.name}
            onPress={() => void choosePlan(plan.name)}
            variant={plan.name === "PRO" ? "accent" : "glass"}
          >
            <View className="flex-row items-start justify-between">
              <View>
                <Text className="text-h2 text-content-primary">{plan.name}</Text>
                <Text className="text-display text-accent">${duration === "yearly" ? Math.round(plan.price * 12 * 0.8) : plan.price}</Text>
                <Text className="text-caption text-content-tertiary">{duration === "yearly" ? "/year" : "/mo"}</Text>
              </View>
              {plan.tag ? <Badge tone="accent">{plan.tag}</Badge> : current.plan === plan.name ? <Badge tone="active">Current</Badge> : null}
            </View>
            <View className="gap-2">
              {plan.features.map((feature) => (
                <View className="flex-row items-center gap-2" key={feature}>
                  <Check color="#22C55E" size={16} />
                  <Text className="text-body text-content-secondary">{feature}</Text>
                </View>
              ))}
            </View>
          </Card>
        ))}
      </View>

      <SectionHeader title="Billing History" />
      {history.isLoading ? (
        <Skeleton variant="list" />
      ) : history.isError ? (
        <ErrorState message="Billing history could not be loaded." onRetry={() => void history.refetch()} />
      ) : (
        <FlatList
          ListEmptyComponent={<EmptyState description="Invoices and payment attempts will appear here." icon={CreditCard} title="No billing history" />}
          contentContainerStyle={{ gap: 12 }}
          data={history.data ?? sampleHistory}
          getItemLayout={(_: unknown, index: number) => ({ index, length: 92, offset: 92 * index })}
          keyExtractor={(item: PaymentHistoryItem) => item.id}
          renderItem={renderHistory}
          scrollEnabled={false}
        />
      )}
      {current.plan !== "FREE" ? (
        <Button accessibilityLabel="Cancel subscription" onPress={() => setCancelOpen(true)} variant="ghost">
          Cancel Subscription
        </Button>
      ) : null}
      <Sheet onClose={() => setCancelOpen(false)} title="Cancel Subscription" visible={cancelOpen}>
        <View className="gap-4">
          <Text className="text-body text-content-secondary">Choose a reason before cancelling your current plan.</Text>
          <Button accessibilityLabel="Keep subscription" onPress={() => setCancelOpen(false)} variant="secondary">
            Keep Plan
          </Button>
          <Button accessibilityLabel="Confirm cancellation" icon={X} onPress={() => setCancelOpen(false)} variant="danger">
            Cancel Plan
          </Button>
        </View>
      </Sheet>
    </Screen>
  );
}
