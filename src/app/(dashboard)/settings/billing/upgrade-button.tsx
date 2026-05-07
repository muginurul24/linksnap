"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { PaidPlan, PaymentDuration } from "@/lib/validations/payment";

type CreatePaymentResponse =
  | {
      data: {
        orderId: string;
        redirectUrl: string;
        snapToken: string;
      };
      success: true;
    }
  | {
      error: {
        code: string;
        message: string;
      };
      success: false;
    };

type UpgradeButtonProps = {
  current: boolean;
  duration?: PaymentDuration;
  plan: PaidPlan;
};

export function UpgradeButton({
  current,
  duration = "MONTHLY",
  plan,
}: UpgradeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function createPayment() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/payments/create", {
        body: JSON.stringify({ duration, plan }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const body = (await response.json()) as CreatePaymentResponse;

      if (!body.success) {
        toast.error(body.error.message);
        return;
      }

      window.location.assign(body.data.redirectUrl);
    } catch {
      toast.error("Unable to start checkout.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      aria-busy={isLoading}
      className="w-full"
      disabled={current || isLoading}
      onClick={createPayment}
      type="button"
      variant={current ? "secondary" : "default"}
    >
      {isLoading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <CreditCard className="size-4" />
      )}
      {current ? "Current Plan" : `Upgrade to ${plan === "PRO" ? "Pro" : "Business"}`}
    </Button>
  );
}
