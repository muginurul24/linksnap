import type { DashboardOverview } from "@/lib/dashboard/overview";

export type DashboardOnboardingStep = {
  actionHref: string;
  actionLabel: string;
  completed: boolean;
  id: "create-link" | "customize-link" | "share-link";
  title: string;
};

export type DashboardOnboardingState = {
  firstLinkSlug: string | null;
  hasAnyClicks: boolean;
  isNewUser: boolean;
  showChecklist: boolean;
  showShareCta: boolean;
  steps: DashboardOnboardingStep[];
};

function hasAnyClicks(overview: DashboardOverview): boolean {
  return (
    overview.clicksToday > 0 ||
    overview.qrScans > 0 ||
    overview.clickTrend.some((point) => point.clicks > 0) ||
    overview.recentLinks.some((link) => link.clicks > 0)
  );
}

export function getDashboardOnboardingState(
  overview: DashboardOverview,
): DashboardOnboardingState {
  const hasLinks = overview.totalLinks > 0;
  const hasCustomizedLink =
    overview.activeCampaigns > 0 ||
    overview.qrScans > 0 ||
    overview.recentLinks.some((link) => link.hasLinkPage);
  const hasClicks = hasAnyClicks(overview);
  const firstLinkSlug = overview.recentLinks[0]?.slug ?? null;
  const steps: DashboardOnboardingStep[] = [
    {
      actionHref: "/links/new",
      actionLabel: "Create Link",
      completed: hasLinks,
      id: "create-link",
      title: "Create your first short link",
    },
    {
      actionHref: hasLinks ? "/links" : "/links/new",
      actionLabel: hasLinks ? "Customize" : "Start",
      completed: hasCustomizedLink,
      id: "customize-link",
      title: "Add a Link Page, QR code, or campaign",
    },
    {
      actionHref: "/links",
      actionLabel: "Share",
      completed: hasClicks,
      id: "share-link",
      title: "Share the link and collect the first click",
    },
  ];

  return {
    firstLinkSlug,
    hasAnyClicks: hasClicks,
    isNewUser: !hasLinks,
    showChecklist: !hasLinks,
    showShareCta: hasLinks && !hasClicks && firstLinkSlug !== null,
    steps,
  };
}
