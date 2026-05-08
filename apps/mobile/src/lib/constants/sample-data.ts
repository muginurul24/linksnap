import type { Campaign, DashboardOverview, LinkAnalytics, LinkItem, NotificationPreferences, PaymentHistoryItem, SubscriptionSummary, User } from "@/types";

export const sampleUser: User = {
  email: "rafi@linksnap.id",
  id: "user_demo",
  name: "Rafi Link",
  plan: "FREE",
};

export const sampleLinks: LinkItem[] = [
  {
    clickCount: 1280,
    clicksToday: 84,
    createdAt: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    destinationUrl: "https://shop.example.com/ramadhan-bundle",
    hasLinkPage: true,
    id: "lnk_1",
    isActive: true,
    shortUrl: "https://linksnap.id/ramadhan",
    slug: "ramadhan",
    title: "Ramadhan Bundle",
    uniqueVisitors: 642,
  },
  {
    clickCount: 760,
    clicksToday: 31,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    destinationUrl: "https://linksnap.id/pricing",
    hasLinkPage: false,
    id: "lnk_2",
    isActive: true,
    shortUrl: "https://linksnap.id/pro",
    slug: "pro",
    title: "Pricing",
    uniqueVisitors: 388,
  },
  {
    clickCount: 92,
    clicksToday: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    destinationUrl: "https://docs.linksnap.id/api",
    hasLinkPage: false,
    id: "lnk_3",
    isActive: false,
    shortUrl: "https://linksnap.id/api-docs",
    slug: "api-docs",
    title: "API Docs",
    uniqueVisitors: 71,
  },
];

export const sampleSubscription: SubscriptionSummary = {
  nextBillingDate: null,
  plan: "FREE",
  status: "Active",
};

export const sampleDashboard: DashboardOverview = {
  recentLinks: sampleLinks,
  stats: {
    activeCampaigns: 2,
    clicksToday: 115,
    links: 24,
  },
  subscription: sampleSubscription,
  user: sampleUser,
};

export const sampleAnalytics: LinkAnalytics = {
  avgCtr: 18.4,
  bounceRate: 22.1,
  clicks: [
    { clicks: 8, label: "Mon" },
    { clicks: 14, label: "Tue" },
    { clicks: 21, label: "Wed" },
    { clicks: 17, label: "Thu" },
    { clicks: 38, label: "Fri" },
    { clicks: 42, label: "Sat" },
    { clicks: 29, label: "Sun" },
  ],
  countries: [
    { count: 640, country: "Indonesia", flag: "ID" },
    { count: 210, country: "Malaysia", flag: "MY" },
    { count: 84, country: "Singapore", flag: "SG" },
  ],
  devices: [
    { device: "Mobile", percentage: 72 },
    { device: "Desktop", percentage: 21 },
    { device: "Tablet", percentage: 7 },
  ],
  referrers: [
    { count: 512, source: "Instagram" },
    { count: 284, source: "WhatsApp" },
    { count: 96, source: "Direct" },
  ],
  totalClicks: 1280,
  uniqueVisitors: 642,
};

export const sampleCampaigns: Campaign[] = [
  {
    color: "#F59E0B",
    conversionRate: 12.7,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    description: "Marketplace promo links with UTM automation.",
    id: "camp_1",
    linkCount: 8,
    name: "Ramadhan Sale",
    totalClicks: 2840,
    utm: { campaign: "ramadhan_sale", medium: "social", source: "instagram" },
  },
  {
    color: "#3B82F6",
    conversionRate: 8.4,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18).toISOString(),
    description: "Developer acquisition and API docs campaign.",
    id: "camp_2",
    linkCount: 5,
    name: "Developer Launch",
    totalClicks: 940,
    utm: { campaign: "developer_launch", medium: "content", source: "blog" },
  },
];

export const sampleHistory: PaymentHistoryItem[] = [
  { amount: "$8.00", date: "2026-05-01", id: "pay_1", status: "Paid" },
  { amount: "$8.00", date: "2026-04-01", id: "pay_2", status: "Paid" },
];

export const sampleNotificationPrefs: NotificationPreferences = {
  billingAlerts: true,
  campaignAlerts: true,
  clickMilestones: true,
  securityAlerts: true,
};
