import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ApiKeysPanel } from "../../src/app/(dashboard)/settings/api-keys-panel";
import { getCampaignCreateQuotaState } from "../../src/app/(dashboard)/campaigns/campaign-plan-gates";
import { getLinkCreateQuotaState } from "../../src/app/(dashboard)/links/link-plan-gates";
import { getQrDownloadQuotaState } from "../../src/app/(dashboard)/qr/qr-plan-gates";
import { RuleBuilder } from "../../src/components/smart-rules/rule-builder";
import { PlanProvider } from "../../src/lib/auth/plan-context";
import type { RuleBuilderValue } from "../../src/lib/rules/rule-builder";

function ruleBuilderValue(ruleCount: number): RuleBuilderValue {
  return {
    fallbackDestinationUrl: "",
    rules: Array.from({ length: ruleCount }, (_, index) => ({
      conditions: [
        {
          id: `condition-${index}`,
          operator: "is",
          type: "country",
          value: "ID",
        },
      ],
      destinationUrl: "https://example.com",
      id: `rule-${index}`,
      isActive: true,
    })),
  };
}

describe("dashboard plan gates", () => {
  it("should lock API key creation for free users with PlanGate", () => {
    const markup = renderToStaticMarkup(
      <PlanProvider userPlan="FREE">
        <ApiKeysPanel initialApiKeys={[]} />
      </PlanProvider>,
    );

    expect(markup).toContain("API key access requires Pro or Business plan.");
    expect(markup).toContain('data-plan-gate-state="locked"');
    expect(markup).toContain("Create Key");
    expect(markup).toContain("disabled");
  });

  it("should render API key creation normally for paid users", () => {
    const markup = renderToStaticMarkup(
      <PlanProvider userPlan="PRO">
        <ApiKeysPanel initialApiKeys={[]} />
      </PlanProvider>,
    );

    expect(markup).toContain("Create Key");
    expect(markup).toContain("No API keys yet");
    expect(markup).not.toContain("API key access requires Pro or Business plan.");
  });

  it("should lock the RuleBuilder add-rule button at plan quota", () => {
    const markup = renderToStaticMarkup(
      <RuleBuilder
        onChange={vi.fn()}
        quota={{
          limit: 5,
          upgradeMessage: "Smart Rule quota reached.",
          upgradeUrl: "/settings/billing?upgrade=smart-rules",
        }}
        value={ruleBuilderValue(5)}
      />,
    );

    expect(markup).toContain("Smart Rule quota reached.");
    expect(markup).toContain("Quota: 5/5");
    expect(markup).toContain("Add rule");
    expect(markup).toContain("disabled");
  });

  it("should expose campaign create quota state from the current plan", () => {
    expect(
      getCampaignCreateQuotaState({ campaignCount: 10, userPlan: "PRO" }),
    ).toEqual({
      limit: 10,
      used: 10,
    });
    expect(
      getCampaignCreateQuotaState({
        campaignCount: 50_000,
        userPlan: "BUSINESS",
      }).limit,
    ).toBe(Number.POSITIVE_INFINITY);
  });

  it("should expose link create quota state from the current plan", () => {
    expect(getLinkCreateQuotaState({ linkCount: 25, userPlan: "FREE" })).toEqual({
      limit: 25,
      used: 25,
    });
    expect(getLinkCreateQuotaState({ linkCount: 499, userPlan: "PRO" })).toEqual({
      limit: 500,
      used: 499,
    });
  });

  it("should count older active links for QR download quota", () => {
    const links = [
      { createdAt: new Date("2026-01-01T00:00:00Z"), id: "old", isActive: true },
      {
        createdAt: new Date("2026-01-02T00:00:00Z"),
        id: "inactive",
        isActive: false,
      },
      { createdAt: new Date("2026-01-03T00:00:00Z"), id: "current", isActive: true },
    ];

    expect(
      getQrDownloadQuotaState({
        link: links[2],
        links,
        userPlan: "FREE",
      }),
    ).toEqual({
      limit: 10,
      used: 1,
    });
  });
});
