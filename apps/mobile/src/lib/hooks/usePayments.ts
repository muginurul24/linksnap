import { useMutation, useQuery } from "@tanstack/react-query";
import { paymentsApi, type CheckoutResult } from "@/lib/api/payments";
import type { PaymentHistoryItem, Plan, SubscriptionSummary } from "@/types";

export function useSubscription() {
  return useQuery<SubscriptionSummary>({
    queryFn: paymentsApi.subscriptionStatus,
    queryKey: ["subscription"],
    staleTime: 60_000,
  });
}

export function usePaymentHistory() {
  return useQuery<PaymentHistoryItem[]>({
    queryFn: paymentsApi.history,
    queryKey: ["payments", "history"],
    staleTime: 60_000,
  });
}

export function useCheckout() {
  return useMutation<CheckoutResult, { plan: Exclude<Plan, "FREE">; duration: "monthly" | "yearly" }>({
    mutationFn: paymentsApi.checkout,
  });
}
