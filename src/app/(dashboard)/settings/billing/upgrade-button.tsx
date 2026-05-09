"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { UpgradeDialog } from "@/components/payments/upgrade-dialog";
import { Button } from "@/components/ui/button";
import type { PaidPlan, PaymentDuration } from "@/lib/validations/payment";
export {
  getPaymentCreateEndpoint,
  getPaymentRedirectUrl,
} from "@/lib/payments/checkout-client";

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
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        className="w-full"
        disabled={current}
        onClick={() => setOpen(true)}
        type="button"
        variant={current ? "secondary" : "default"}
      >
        <Building2 className="size-4" />
        {current ? "Current Plan" : `Upgrade to ${plan === "PRO" ? "Pro" : "Business"}`}
      </Button>
      <UpgradeDialog
        duration={duration}
        onOpenChange={setOpen}
        open={open}
        plan={plan}
      />
    </>
  );
}
