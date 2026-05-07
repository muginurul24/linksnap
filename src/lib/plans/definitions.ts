import {
  getApiEndpointRateLimit,
  getCampaignQuota,
  getLinkPageQuota,
  getLinkQuota,
  getQrQuota,
  getSmartRuleQuota,
  type UserPlan,
} from "@/lib/links/limits";

export type PlanDefinition = {
  cta: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  id: UserPlan;
  limits: {
    analyticsRetentionDays: number;
    apiRequestsPerMinute: number;
    campaigns: number;
    linkPages: number;
    links: number;
    qrCodes: number;
    smartRulesPerLink: number;
    splitTestVariants: number;
  };
  monthlyUsd: number;
  name: "Free" | "Pro" | "Business";
  yearlyUsd: number;
};

export type PlanComparisonRow = {
  business: string;
  feature: string;
  free: string;
  pro: string;
};

const ANALYTICS_RETENTION_DAYS: Record<UserPlan, number> = {
  FREE: 30,
  PRO: 180,
  BUSINESS: 365,
};

const SPLIT_TEST_VARIANTS: Record<UserPlan, number> = {
  FREE: 0,
  PRO: 3,
  BUSINESS: Number.POSITIVE_INFINITY,
};

function formatLimit(value: number, unlimited = "Unlimited"): string {
  return Number.isFinite(value) ? String(value) : unlimited;
}

function reqPerHour(plan: UserPlan): number {
  return getApiEndpointRateLimit(plan) * 60;
}

function buildLimits(plan: UserPlan): PlanDefinition["limits"] {
  return {
    analyticsRetentionDays: ANALYTICS_RETENTION_DAYS[plan],
    apiRequestsPerMinute: getApiEndpointRateLimit(plan),
    campaigns: getCampaignQuota(plan),
    linkPages: getLinkPageQuota(plan),
    links: getLinkQuota(plan),
    qrCodes: getQrQuota(plan),
    smartRulesPerLink: getSmartRuleQuota(plan),
    splitTestVariants: SPLIT_TEST_VARIANTS[plan],
  };
}

function featureList(plan: UserPlan): string[] {
  const limits = buildLimits(plan);
  const base = [
    `${formatLimit(limits.links)} short links`,
    `${formatLimit(limits.linkPages)} Link Pages`,
    `${formatLimit(limits.smartRulesPerLink)} Smart Rules per link`,
    `${formatLimit(limits.qrCodes)} QR codes`,
    `${limits.analyticsRetentionDays}-day analytics retention`,
    `${formatLimit(limits.campaigns)} campaign groups`,
  ];

  if (plan === "FREE") return base;

  return [
    ...base,
    limits.splitTestVariants === 0
      ? "A/B split testing not included"
      : `${formatLimit(limits.splitTestVariants)} A/B split variants`,
    `API access at ${reqPerHour(plan)} req/hr`,
    ...(plan === "BUSINESS" ? ["Webhook callbacks", "Priority support"] : []),
  ];
}

export const PLANS = [
  {
    cta: "Get Started Free",
    description: "For validating your first smart links.",
    features: featureList("FREE"),
    id: "FREE",
    limits: buildLimits("FREE"),
    monthlyUsd: 0,
    name: "Free",
    yearlyUsd: 0,
  },
  {
    cta: "Start Pro",
    description: "For active marketers and growing stores.",
    features: featureList("PRO"),
    highlighted: true,
    id: "PRO",
    limits: buildLimits("PRO"),
    monthlyUsd: 8,
    name: "Pro",
    yearlyUsd: 75,
  },
  {
    cta: "Start Business",
    description: "For high-volume campaigns and teams.",
    features: featureList("BUSINESS"),
    id: "BUSINESS",
    limits: buildLimits("BUSINESS"),
    monthlyUsd: 19,
    name: "Business",
    yearlyUsd: 180,
  },
] as const satisfies readonly PlanDefinition[];

export function getPlanDefinition(plan: UserPlan): PlanDefinition {
  return PLANS.find((item) => item.id === plan) ?? PLANS[0];
}

export function formatUsdPrice(amount: number): string {
  return amount === 0 ? "$0" : `$${amount}`;
}

export function getYearlySavings(plan: PlanDefinition): number {
  return plan.monthlyUsd * 12 - plan.yearlyUsd;
}

export const PLAN_COMPARISON_ROWS: PlanComparisonRow[] = [
  {
    business: formatLimit(getLinkQuota("BUSINESS")),
    feature: "Short links",
    free: formatLimit(getLinkQuota("FREE")),
    pro: formatLimit(getLinkQuota("PRO")),
  },
  {
    business: formatLimit(getLinkPageQuota("BUSINESS")),
    feature: "Link Pages",
    free: formatLimit(getLinkPageQuota("FREE")),
    pro: formatLimit(getLinkPageQuota("PRO")),
  },
  {
    business: formatLimit(getSmartRuleQuota("BUSINESS")),
    feature: "Smart Rules per link",
    free: formatLimit(getSmartRuleQuota("FREE")),
    pro: formatLimit(getSmartRuleQuota("PRO")),
  },
  {
    business: formatLimit(getQrQuota("BUSINESS")),
    feature: "QR codes",
    free: formatLimit(getQrQuota("FREE")),
    pro: formatLimit(getQrQuota("PRO")),
  },
  {
    business: formatLimit(getCampaignQuota("BUSINESS")),
    feature: "Campaign groups",
    free: formatLimit(getCampaignQuota("FREE")),
    pro: formatLimit(getCampaignQuota("PRO")),
  },
  {
    business: `${ANALYTICS_RETENTION_DAYS.BUSINESS} days`,
    feature: "Analytics retention",
    free: `${ANALYTICS_RETENTION_DAYS.FREE} days`,
    pro: `${ANALYTICS_RETENTION_DAYS.PRO} days`,
  },
  {
    business: formatLimit(SPLIT_TEST_VARIANTS.BUSINESS),
    feature: "A/B split testing",
    free: "Not included",
    pro: `${SPLIT_TEST_VARIANTS.PRO} variants`,
  },
  {
    business: `${reqPerHour("BUSINESS")} req/hr`,
    feature: "API rate limit",
    free: `${reqPerHour("FREE")} req/hr`,
    pro: `${reqPerHour("PRO")} req/hr`,
  },
  {
    business: "Included",
    feature: "Webhook callbacks",
    free: "Not included",
    pro: "Not included",
  },
];
