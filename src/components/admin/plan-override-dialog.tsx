"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { UserPlan } from "@/lib/links/limits";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: UserPlan;
  userEmail: string;
  onConfirm: (plan: UserPlan) => Promise<void>;
};

const USER_PLANS = new Set(["FREE", "PRO", "BUSINESS"]);

function isUserPlan(value: string): value is UserPlan {
  return USER_PLANS.has(value);
}

export function PlanOverrideDialog({
  open,
  onOpenChange,
  currentPlan,
  userEmail,
  onConfirm,
}: Props) {
  const [selectedPlan, setSelectedPlan] = useState<UserPlan>(currentPlan);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm() {
    setIsSubmitting(true);
    try {
      await onConfirm(selectedPlan);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change User Plan</DialogTitle>
          <DialogDescription>
            Override the plan for <strong>{userEmail}</strong>. Their current
            plan is <strong>{currentPlan}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-3">
          <label className="text-sm font-medium">New Plan</label>
          <Select
            value={selectedPlan}
            onValueChange={(value) => {
              if (!value) return;
              if (isUserPlan(value)) setSelectedPlan(value);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FREE">Free</SelectItem>
              <SelectItem value="PRO">Pro</SelectItem>
              <SelectItem value="BUSINESS">Business</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleConfirm()}
            disabled={isSubmitting || selectedPlan === currentPlan}
          >
            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Change Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
