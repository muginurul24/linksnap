"use client";

import { useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { PaidPlan, PaymentDuration } from "@/lib/validations/payment";

type PaymentResponseData = {
  orderId: string;
  redirectUrl?: string;
  snapToken?: string;
};

type CreatePaymentResponse =
  | {
      data: PaymentResponseData;
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

export function getPaymentCreateEndpoint(): string {
  return "/api/v1/payments/create";
}

export function getPaymentRedirectUrl(data: PaymentResponseData): string | null {
  return data.redirectUrl ?? null;
}

export function UpgradeButton({
  current,
  duration = "MONTHLY",
  plan,
}: UpgradeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function createPayment() {
    setIsLoading(true);

    try {
      const response = await fetch(getPaymentCreateEndpoint(), {
        body: JSON.stringify({ duration, plan }),
        headers: {
          "content-type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        method: "POST",
      });
      const body = (await response.json()) as CreatePaymentResponse;

      if (!body.success) {
        toast.error(body.error.message);
        return;
      }

      const redirectUrl = getPaymentRedirectUrl(body.data);
      if (!redirectUrl) {
        toast.error("Checkout did not return a redirect URL.");
        return;
      }

      window.location.assign(redirectUrl);
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
        <Building2 className="size-4" />
      )}
      {current ? "Current Plan" : `Upgrade to ${plan === "PRO" ? "Pro" : "Business"}`}
    </Button>
  );
}
