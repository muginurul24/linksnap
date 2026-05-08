export type Plan = "FREE" | "PRO" | "BUSINESS";
export type PaymentStatus = "PENDING" | "SETTLEMENT" | "CANCEL" | "DENY" | "EXPIRE";
export type LinkStatus = "active" | "pending" | "error";

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
};

export type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  plan: Plan;
  emailVerified?: string | null;
};

export type LinkItem = {
  id: string;
  slug: string;
  shortUrl: string;
  destinationUrl: string;
  title?: string | null;
  isActive: boolean;
  hasLinkPage: boolean;
  clickCount: number;
  clicksToday: number;
  uniqueVisitors?: number;
  createdAt: string;
  campaignId?: string | null;
};

export type DashboardOverview = {
  user: User;
  stats: {
    links: number;
    clicksToday: number;
    activeCampaigns: number;
  };
  recentLinks: LinkItem[];
  subscription: SubscriptionSummary;
};

export type AnalyticsPoint = {
  label: string;
  clicks: number;
};

export type LinkAnalytics = {
  totalClicks: number;
  uniqueVisitors: number;
  avgCtr: number;
  bounceRate: number;
  clicks: AnalyticsPoint[];
  countries: Array<{ country: string; count: number; flag: string }>;
  devices: Array<{ device: "Mobile" | "Desktop" | "Tablet"; percentage: number }>;
  referrers: Array<{ source: string; count: number }>;
};

export type Campaign = {
  id: string;
  name: string;
  description?: string | null;
  linkCount: number;
  totalClicks: number;
  conversionRate: number;
  color: string;
  utm: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  createdAt: string;
};

export type SubscriptionSummary = {
  plan: Plan;
  status: "Active" | "Expiring" | "Expired";
  nextBillingDate?: string | null;
};

export type PaymentHistoryItem = {
  id: string;
  date: string;
  amount: string;
  status: "Paid" | "Pending" | "Failed";
};

export type ApiKey = {
  id: string;
  name: string;
  last4: string;
  createdAt: string;
};

export type NotificationPreferences = {
  clickMilestones: boolean;
  campaignAlerts: boolean;
  billingAlerts: boolean;
  securityAlerts: boolean;
};

export type MutationQueueItem = {
  id: string;
  method: "POST" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  createdAt: string;
};
