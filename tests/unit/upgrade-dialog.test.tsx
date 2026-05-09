import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  formatUpgradeAmount,
  getUpgradeDurationLabel,
  getUpgradePlanLabel,
} from "../../src/components/payments/upgrade-dialog";

function readSource(path: string): string {
  return readFileSync(path, "utf8");
}

describe("upgrade dialog", () => {
  it("should expose plan and amount labels for the upgrade flow", () => {
    expect(getUpgradePlanLabel("PRO")).toBe("Pro");
    expect(getUpgradePlanLabel("BUSINESS")).toBe("Business");
    expect(getUpgradeDurationLabel("YEARLY")).toBe("Yearly");
    expect(formatUpgradeAmount("PRO", "MONTHLY")).toBe("$8");
  });

  it("should include plan confirmation copy as the first step", () => {
    const source = readSource("src/components/payments/upgrade-dialog.tsx");

    expect(source).toContain('useState<UpgradeStep>("plan")');
    expect(source).toContain("Upgrade to {planLabel}");
    expect(source).toContain("Choose payment method");
    expect(source).toContain("LinkSnap {planLabel}");
  });

  it("should wire payment selection into the create payment request", () => {
    const source = readSource("src/components/payments/upgrade-dialog.tsx");

    expect(source).toContain("<PaymentMethodSelector");
    expect(source).toContain("paymentMethod: selectedChannel.id");
    expect(source).toContain("tryStartSingleFlight(submitGuard)");
    expect(source).toContain("window.confirm");
    expect(source).toContain("h-[100dvh]");
    expect(source).toContain("animate-in fade-in-0 slide-in-from-right-2");
  });
});
