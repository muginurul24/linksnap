class ApiEndpoints {
  ApiEndpoints._();

  static const authRegister = '/api/v1/auth/register';
  static const authVerify = '/api/v1/auth/verify';
  static const authLogin = '/api/v1/auth/login';
  static const authGoogle = '/api/v1/auth/google';
  static const authRefresh = '/api/v1/auth/refresh';
  static const authLogout = '/api/v1/auth/logout';
  static const authMe = '/api/v1/auth/me';
  static const authResendOtp = '/api/v1/auth/resend-otp';
  static const authForgotPassword = '/api/v1/auth/forgot-password';
  static const authResetPassword = '/api/v1/auth/reset-password';

  static const dashboardOverview = '/api/v1/dashboard/overview';
  static const dashboardActivity = '/api/v1/dashboard/activity';
  static const dashboardStats = '/api/v1/dashboard/stats';

  static const links = '/api/v1/links';
  static const linkCreate = '/api/v1/links';
  static String link(String id) => '/api/v1/links/$id';
  static String linkEdit(String id) => '/api/v1/links/$id';
  static String linkDelete(String id) => '/api/v1/links/$id';
  static String linkAnalytics(String id) => '/api/v1/links/$id/analytics';
  static String linkQr(String id) => '/api/v1/links/$id/qr';
  static String linkPage(String id) => '/api/v1/links/$id/page';
  static String linkRules(String id) => '/api/v1/links/$id/rules';
  static String linkRule(String id, String ruleId) => '/api/v1/links/$id/rules/$ruleId';
  static const slugAvailability = '/api/v1/links/slug';
  static const linksBulk = '/api/v1/links/bulk';
  static const linksExport = '/api/v1/links/export';
  static const linksRecent = '/api/v1/links/recent';

  static const campaigns = '/api/v1/campaigns';
  static String campaign(String id) => '/api/v1/campaigns/$id';
  static String campaignLinks(String id) => '/api/v1/campaigns/$id/links';
  static String campaignAnalytics(String id) => '/api/v1/campaigns/$id/analytics';
  static String campaignUtm(String id) => '/api/v1/campaigns/$id/utm-template';

  static const analyticsOverview = '/api/v1/analytics/overview';
  static const analyticsCountries = '/api/v1/analytics/countries';
  static const analyticsDevices = '/api/v1/analytics/devices';
  static const analyticsReferrers = '/api/v1/analytics/referrers';
  static const analyticsExport = '/api/v1/analytics/export';

  static const billingPlans = '/api/v1/billing/plans';
  static const billingSubscription = '/api/v1/billing/subscription';
  static const billingCheckout = '/api/v1/billing/checkout';
  static const billingCheckoutStatus = '/api/v1/billing/checkout/status';
  static const billingHistory = '/api/v1/billing/history';
  static const billingInvoices = '/api/v1/billing/invoices';
  static const billingCancel = '/api/v1/billing/cancel';
  static const billingResume = '/api/v1/billing/resume';

  static const settingsProfile = '/api/v1/settings/profile';
  static const settingsAvatar = '/api/v1/settings/avatar';
  static const settingsSecurity = '/api/v1/settings/security';
  static const settingsPassword = '/api/v1/settings/password';
  static const settingsTwoFactor = '/api/v1/settings/two-factor';
  static const settingsNotifications = '/api/v1/settings/notifications';
  static const settingsApiKeys = '/api/v1/settings/api-keys';
  static String settingsApiKey(String id) => '/api/v1/settings/api-keys/$id';
  static const settingsDeleteAccount = '/api/v1/settings/delete-account';

  static const qrScan = '/api/v1/qr/scan';
  static const qrGenerate = '/api/v1/qr/generate';
  static const supportHelp = '/api/v1/support/help';
}
