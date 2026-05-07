"use client";

import { useState } from "react";
import { Building2, CreditCard, Landmark, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PaymentGatewayOption } from "@/lib/payments/gateway-selection";
import type { PaidPlan, PaymentDuration } from "@/lib/validations/payment";

type PaymentResponseData = {
  orderId: string;
  redirectUrl?: string;
  snapToken?: string;
  sessionId?: string;
  url?: string;
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
  availableGateways?: PaymentGatewayOption[];
  current: boolean;
  duration?: PaymentDuration;
  gateway?: PaymentGatewayOption;
  plan: PaidPlan;
};

const GATEWAY_OPTIONS: Record<
  PaymentGatewayOption,
  {
    description: string;
    icon: typeof CreditCard;
    label: string;
  }
> = {
  midtrans: {
    description: "Bank Lokal",
    icon: Landmark,
    label: "Midtrans",
  },
  stripe: {
    description: "Credit Card",
    icon: CreditCard,
    label: "Stripe",
  },
};

export function getPaymentCreateEndpoint(gateway: PaymentGatewayOption): string {
  return gateway === "stripe"
    ? "/api/v1/payments/stripe/create"
    : "/api/v1/payments/create";
}

export function getPaymentRedirectUrl(
  gateway: PaymentGatewayOption,
  data: PaymentResponseData,
): string | null {
  return gateway === "stripe" ? data.url ?? null : data.redirectUrl ?? null;
}

export function UpgradeButton({
  availableGateways = ["stripe"],
  current,
  duration = "MONTHLY",
  gateway,
  plan,
}: UpgradeButtonProps) {
  const gatewayOptions: PaymentGatewayOption[] =
    availableGateways.length > 0 ? availableGateways : ["stripe"];
  const initialGateway: PaymentGatewayOption =
    gateway && gatewayOptions.includes(gateway) ? gateway : gatewayOptions[0] ?? "stripe";
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGatewayOption>(
    initialGateway,
  );

  async function createPayment() {
    setIsLoading(true);

    try {
      const response = await fetch(getPaymentCreateEndpoint(selectedGateway), {
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

      const redirectUrl = getPaymentRedirectUrl(selectedGateway, body.data);
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
    <div className="space-y-3">
      <div className="grid gap-2">
        {gatewayOptions.map((option) => {
          const config = GATEWAY_OPTIONS[option];
          const Icon = config.icon;
          const inputId = `${plan.toLowerCase()}-${option}-gateway`;

          return (
            <label
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors",
                selectedGateway === option
                  ? "border-primary bg-primary/5"
                  : "border-border bg-background hover:bg-muted/60",
                current ? "cursor-not-allowed opacity-60" : "",
              )}
              htmlFor={inputId}
              key={option}
            >
              <input
                checked={selectedGateway === option}
                className="size-4 accent-primary"
                disabled={current || gatewayOptions.length === 1}
                id={inputId}
                name={`${plan.toLowerCase()}-gateway`}
                onChange={() => setSelectedGateway(option)}
                type="radio"
                value={option}
              />
              <Icon className="size-4 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="font-medium">{config.label}</span>{" "}
                <span className="text-muted-foreground">({config.description})</span>
              </span>
            </label>
          );
        })}
      </div>

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
        ) : selectedGateway === "midtrans" ? (
          <Building2 className="size-4" />
        ) : (
          <CreditCard className="size-4" />
        )}
        {current
          ? "Current Plan"
          : `Upgrade to ${plan === "PRO" ? "Pro" : "Business"}`}
      </Button>
    </div>
  );
}
