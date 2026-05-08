class LinkModel {
  const LinkModel({
    required this.id,
    required this.slug,
    required this.destination,
    required this.title,
    required this.clicks,
    required this.todayClicks,
    required this.uniqueVisitors,
    required this.active,
    this.campaignId,
    this.hasLinkPage = false,
  });

  final String id;
  final String slug;
  final String destination;
  final String title;
  final int clicks;
  final int todayClicks;
  final int uniqueVisitors;
  final bool active;
  final String? campaignId;
  final bool hasLinkPage;

  factory LinkModel.fromJson(Map<String, dynamic> json) {
    return LinkModel(
      id: (json['id'] ?? '').toString(),
      slug: (json['slug'] ?? '').toString(),
      destination: (json['destination'] ?? json['destinationUrl'] ?? '').toString(),
      title: (json['title'] ?? 'Untitled link').toString(),
      clicks: (json['clicks'] as num?)?.toInt() ?? 0,
      todayClicks: (json['todayClicks'] as num?)?.toInt() ?? 0,
      uniqueVisitors: (json['uniqueVisitors'] as num?)?.toInt() ?? 0,
      active: json['active'] != false,
      campaignId: json['campaignId'] as String?,
      hasLinkPage: json['hasLinkPage'] == true,
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
        'id': id,
        'slug': slug,
        'destination': destination,
        'title': title,
        'clicks': clicks,
        'todayClicks': todayClicks,
        'uniqueVisitors': uniqueVisitors,
        'active': active,
        'campaignId': campaignId,
        'hasLinkPage': hasLinkPage,
      };
}

class DashboardData {
  const DashboardData({
    required this.name,
    required this.linksCount,
    required this.clicksToday,
    required this.campaignsCount,
    required this.plan,
    required this.recentLinks,
  });

  final String name;
  final int linksCount;
  final int clicksToday;
  final int campaignsCount;
  final String plan;
  final List<LinkModel> recentLinks;
}

class CampaignModel {
  const CampaignModel({
    required this.id,
    required this.name,
    required this.linkCount,
    required this.totalClicks,
    required this.source,
    required this.medium,
    required this.campaign,
  });

  final String id;
  final String name;
  final int linkCount;
  final int totalClicks;
  final String source;
  final String medium;
  final String campaign;

  factory CampaignModel.fromJson(Map<String, dynamic> json) {
    return CampaignModel(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? 'Campaign').toString(),
      linkCount: (json['linkCount'] as num?)?.toInt() ?? 0,
      totalClicks: (json['totalClicks'] as num?)?.toInt() ?? 0,
      source: (json['source'] ?? 'instagram').toString(),
      medium: (json['medium'] ?? 'social').toString(),
      campaign: (json['campaign'] ?? json['utmCampaign'] ?? 'campaign').toString(),
    );
  }
}

class AnalyticsPoint {
  const AnalyticsPoint(this.label, this.value);
  final String label;
  final double value;
}

class RankedMetric {
  const RankedMetric(this.label, this.count, this.percent);
  final String label;
  final int count;
  final double percent;
}

class AnalyticsData {
  const AnalyticsData({
    required this.clicks,
    required this.total,
    required this.unique,
    required this.ctr,
    required this.bounceRate,
    required this.countries,
    required this.devices,
    required this.referrers,
  });

  final List<AnalyticsPoint> clicks;
  final int total;
  final int unique;
  final double ctr;
  final double bounceRate;
  final List<RankedMetric> countries;
  final List<RankedMetric> devices;
  final List<RankedMetric> referrers;
}

class PlanModel {
  const PlanModel({
    required this.name,
    required this.monthlyPrice,
    required this.yearlyPrice,
    required this.features,
    this.tag,
    this.current = false,
  });

  final String name;
  final int monthlyPrice;
  final int yearlyPrice;
  final List<String> features;
  final String? tag;
  final bool current;
}

class BillingTransaction {
  const BillingTransaction({
    required this.id,
    required this.date,
    required this.amount,
    required this.status,
  });

  final String id;
  final DateTime date;
  final int amount;
  final String status;
}

class BillingOverview {
  const BillingOverview({
    required this.currentPlan,
    required this.nextBilling,
    required this.plans,
    required this.history,
  });

  final String currentPlan;
  final DateTime nextBilling;
  final List<PlanModel> plans;
  final List<BillingTransaction> history;
}

List<LinkModel> sampleLinks = <LinkModel>[
  const LinkModel(
    id: 'lnk_1',
    slug: 'ramadhan-sale',
    destination: 'https://example.com/ramadhan-sale',
    title: 'Ramadhan Sale',
    clicks: 12400,
    todayClicks: 842,
    uniqueVisitors: 3100,
    active: true,
    campaignId: 'cmp_1',
    hasLinkPage: true,
  ),
  const LinkModel(
    id: 'lnk_2',
    slug: 'gopay-merch',
    destination: 'https://example.com/gopay-merch-drop',
    title: 'GoPay Merch Drop',
    clicks: 8900,
    todayClicks: 510,
    uniqueVisitors: 2200,
    active: true,
    campaignId: 'cmp_1',
    hasLinkPage: true,
  ),
  const LinkModel(
    id: 'lnk_3',
    slug: 'coffee-voucher',
    destination: 'https://example.com/coffee-voucher',
    title: 'Coffee Voucher',
    clicks: 4300,
    todayClicks: 204,
    uniqueVisitors: 1204,
    active: true,
    campaignId: 'cmp_2',
  ),
  const LinkModel(
    id: 'lnk_4',
    slug: 'partner-kit',
    destination: 'https://example.com/partner-kit',
    title: 'Partner Kit',
    clicks: 1740,
    todayClicks: 66,
    uniqueVisitors: 802,
    active: false,
  ),
];

List<CampaignModel> sampleCampaigns = <CampaignModel>[
  const CampaignModel(
    id: 'cmp_1',
    name: 'Ramadhan Growth Sprint',
    linkCount: 8,
    totalClicks: 21300,
    source: 'instagram',
    medium: 'social',
    campaign: 'ramadhan_2026',
  ),
  const CampaignModel(
    id: 'cmp_2',
    name: 'Merchant Voucher Launch',
    linkCount: 5,
    totalClicks: 9300,
    source: 'whatsapp',
    medium: 'chat',
    campaign: 'voucher_launch',
  ),
  const CampaignModel(
    id: 'cmp_3',
    name: 'Developer API Waitlist',
    linkCount: 3,
    totalClicks: 4100,
    source: 'linkedin',
    medium: 'organic',
    campaign: 'api_waitlist',
  ),
];

AnalyticsData sampleAnalytics = const AnalyticsData(
  clicks: <AnalyticsPoint>[
    AnalyticsPoint('Mon', 320),
    AnalyticsPoint('Tue', 440),
    AnalyticsPoint('Wed', 390),
    AnalyticsPoint('Thu', 610),
    AnalyticsPoint('Fri', 842),
    AnalyticsPoint('Sat', 760),
    AnalyticsPoint('Sun', 930),
  ],
  total: 12400,
  unique: 3100,
  ctr: 4.2,
  bounceRate: 32,
  countries: <RankedMetric>[
    RankedMetric('ID Indonesia', 8234, 1),
    RankedMetric('US United States', 2100, 0.25),
    RankedMetric('SG Singapore', 890, 0.11),
  ],
  devices: <RankedMetric>[
    RankedMetric('Mobile', 72, 0.72),
    RankedMetric('Desktop', 21, 0.21),
    RankedMetric('Tablet', 7, 0.07),
  ],
  referrers: <RankedMetric>[
    RankedMetric('Instagram', 5200, 1),
    RankedMetric('WhatsApp', 3300, 0.63),
    RankedMetric('LinkedIn', 1400, 0.27),
  ],
);

BillingOverview sampleBilling = BillingOverview(
  currentPlan: 'PRO',
  nextBilling: DateTime(2026, 6, 8),
  plans: const <PlanModel>[
    PlanModel(name: 'FREE', monthlyPrice: 0, yearlyPrice: 0, features: <String>['25 links', '3 Link Pages', 'Basic analytics'], current: false),
    PlanModel(name: 'PRO', monthlyPrice: 8, yearlyPrice: 77, features: <String>['500 links', '50 Link Pages', 'API access', 'Advanced analytics'], tag: 'Popular', current: true),
    PlanModel(name: 'BUSINESS', monthlyPrice: 19, yearlyPrice: 182, features: <String>['Unlimited links', 'Webhooks', '365-day retention', 'Priority support'], tag: 'Best Value'),
  ],
  history: <BillingTransaction>[
    BillingTransaction(id: 'INV-1042', date: DateTime(2026, 5, 8), amount: 8, status: 'Paid'),
    BillingTransaction(id: 'INV-1031', date: DateTime(2026, 4, 8), amount: 8, status: 'Paid'),
    BillingTransaction(id: 'INV-1019', date: DateTime(2026, 3, 8), amount: 8, status: 'Paid'),
  ],
);
