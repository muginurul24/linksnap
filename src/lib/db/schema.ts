import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  real,
  pgEnum,
  uniqueIndex,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Enums ───
export const planEnum = pgEnum("plan", ["FREE", "PRO", "BUSINESS"]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING",
  "SETTLEMENT",
  "CANCEL",
  "DENY",
  "EXPIRE",
]);
export const ruleTypeEnum = pgEnum("rule_type", [
  "GEO",
  "DEVICE",
  "TIME",
  "LANGUAGE",
]);
export const clickEventTypeEnum = pgEnum("click_event_type", [
  "DIRECT_REDIRECT",
  "LINK_PAGE_VIEW",
  "LINK_PAGE_CTA_CLICK",
]);

export type UserNotificationPreferences = {
  linkPerformanceAlerts: boolean;
  paymentConfirmations: boolean;
  productUpdates: boolean;
  weeklyAnalyticsReport: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: UserNotificationPreferences = {
  linkPerformanceAlerts: true,
  paymentConfirmations: true,
  productUpdates: true,
  weeklyAnalyticsReport: true,
};

// ─── Users ───
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  googleId: varchar("google_id", { length: 255 }).unique(),
  name: varchar("name", { length: 255 }),
  avatarUrl: text("avatar_url"),
  emailVerified: timestamp("email_verified"),
  otpCode: varchar("otp_code", { length: 6 }),
  otpExpiresAt: timestamp("otp_expires_at"),
  refreshTokenHash: text("refresh_token_hash"),
  twoFactorSecret: text("two_factor_secret"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  twoFactorBackupCodeHashes: jsonb("two_factor_backup_code_hashes")
    .$type<string[]>()
    .default([])
    .notNull(),
  notifications: jsonb("notifications")
    .$type<UserNotificationPreferences>()
    .default(DEFAULT_NOTIFICATION_PREFERENCES)
    .notNull(),
  plan: planEnum("plan").default("FREE").notNull(),
  role: varchar("role", { length: 20 }).default("user").notNull(),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Password Reset Tokens ───
export const resetTokens = pgTable(
  "reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    tokenHashIdx: uniqueIndex("reset_tokens_token_hash_idx").on(table.tokenHash),
    userIdIdx: index("reset_tokens_user_id_idx").on(table.userId),
  }),
);

// ─── API Keys ───
export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    keyHash: varchar("key_hash", { length: 64 }).notNull().unique(),
    keyPrefix: varchar("key_prefix", { length: 32 }).notNull(),
    lastUsedAt: timestamp("last_used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    keyHashIdx: uniqueIndex("api_keys_key_hash_idx").on(table.keyHash),
    userIdIdx: index("api_keys_user_id_idx").on(table.userId),
  }),
);

// ─── Links ───
export const links = pgTable(
  "links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    slug: varchar("slug", { length: 50 }).notNull().unique(),
    destinationUrl: text("destination_url").notNull(),
    title: varchar("title", { length: 255 }),
    hasLinkPage: boolean("has_link_page").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    scheduledAt: timestamp("scheduled_at"),
    expiresAt: timestamp("expires_at"),
    clickCount: integer("click_count").default(0).notNull(),
    campaignId: uuid("campaign_id").references(() => campaigns.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex("slug_idx").on(table.slug),
    userIdIdx: index("links_user_id_idx").on(table.userId),
    campaignIdx: index("links_campaign_idx").on(table.campaignId),
    userIdCreatedAtIdx: index("links_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
  }),
);

// ─── Link Pages ───
export const linkPages = pgTable("link_pages", {
  id: uuid("id").defaultRandom().primaryKey(),
  linkId: uuid("link_id")
    .references(() => links.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  brandName: varchar("brand_name", { length: 100 }).notNull(),
  brandLogo: text("brand_logo"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  ogImage: text("og_image"),
  ctaText: varchar("cta_text", { length: 50 }).default("Continue").notNull(),
  ctaColor: varchar("cta_color", { length: 7 }).default("#6366f1").notNull(),
  showCountdown: boolean("show_countdown").default(false),
  countdownTarget: timestamp("countdown_target"),
  showSocialProof: boolean("show_social_proof").default(true),
  showQrCode: boolean("show_qr_code").default(true),
  theme: varchar("theme", { length: 20 }).default("auto").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Smart Rules ───
export const smartRules = pgTable(
  "smart_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    linkId: uuid("link_id")
      .references(() => links.id, { onDelete: "cascade" })
      .notNull(),
    type: ruleTypeEnum("type").notNull(),
    condition: jsonb("condition").notNull(),
    destinationUrl: text("destination_url").notNull(),
    priority: integer("priority").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    linkIdIdx: index("rules_link_id_idx").on(table.linkId),
  }),
);

// ─── Click Events ───
export const clickEvents = pgTable(
  "click_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    linkId: uuid("link_id")
      .references(() => links.id, { onDelete: "cascade" })
      .notNull(),
    ruleId: uuid("rule_id").references(() => smartRules.id, {
      onDelete: "set null",
    }),
    eventType: clickEventTypeEnum("event_type").default("DIRECT_REDIRECT").notNull(),
    linkPageHasCountdown: boolean("link_page_has_countdown").default(false).notNull(),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    ipHash: varchar("ip_hash", { length: 64 }),
    country: varchar("country", { length: 100 }),
    city: varchar("city", { length: 100 }),
    referrer: text("referrer"),
    userAgent: text("user_agent"),
    device: varchar("device", { length: 20 }),
    browser: varchar("browser", { length: 50 }),
    os: varchar("os", { length: 50 }),
  },
  (table) => ({
    linkIdIdx: index("ce_link_id_idx").on(table.linkId),
    tsIdx: index("ce_ts_idx").on(table.timestamp),
    linkIdTimestampIdx: index("ce_link_ts_idx").on(
      table.linkId,
      table.timestamp,
    ),
  }),
);

// ─── Campaigns ───
export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    description: text("description"),
    utmSource: varchar("utm_source", { length: 100 }),
    utmMedium: varchar("utm_medium", { length: 100 }),
    utmCampaign: varchar("utm_campaign", { length: 100 }),
    utmTerm: varchar("utm_term", { length: 100 }),
    utmContent: varchar("utm_content", { length: 100 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("campaigns_user_idx").on(table.userId),
    slugIdx: uniqueIndex("campaigns_slug_idx").on(table.userId, table.slug),
  }),
);

// ─── Split Tests ───
export const splitTests = pgTable("split_tests", {
  id: uuid("id").defaultRandom().primaryKey(),
  linkId: uuid("link_id")
    .references(() => links.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const splitTestVariants = pgTable("split_test_variants", {
  id: uuid("id").defaultRandom().primaryKey(),
  splitTestId: uuid("split_test_id")
    .references(() => splitTests.id, { onDelete: "cascade" })
    .notNull(),
  destinationUrl: text("destination_url").notNull(),
  weight: integer("weight").default(50).notNull(),
  clickCount: integer("click_count").default(0).notNull(),
});

// ─── Payments ───
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  plan: planEnum("plan").notNull(),
  status: varchar("status", { length: 20 }).default("ACTIVE").notNull(),
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  canceledAt: timestamp("canceled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  orderId: varchar("order_id", { length: 100 }).notNull().unique(),
  plan: planEnum("plan").notNull(),
  duration: varchar("duration", { length: 10 }).notNull(),
  grossAmountUsd: real("gross_amount_usd").notNull(),
  grossAmountIdr: integer("gross_amount_idr").notNull(),
  status: paymentStatusEnum("status").default("PENDING").notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }),
  snapToken: text("snap_token"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("tx_user_idx").on(table.userId),
  settledUserIdIdx: index("tx_settled_user_idx")
    .on(table.userId)
    .where(sql`${table.status} = 'SETTLEMENT'`),
}));

// ─── Admin Audit Log ───
export const SUPERADMIN_ROLE = "superadmin";

export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adminUserId: uuid("admin_user_id")
      .references(() => users.id, { onDelete: "set null" })
      .notNull(),
    action: varchar("action", { length: 50 }).notNull(),
    // action values: "user.plan.change", "user.suspend", "user.unsuspend",
    //               "system.config", "admin.login", "admin.api.request"
    targetUserId: uuid("target_user_id")
      .references(() => users.id, { onDelete: "set null" }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    adminUserIdIdx: index("audit_admin_user_idx").on(table.adminUserId),
    actionIdx: index("audit_action_idx").on(table.action),
    createdAtIdx: index("audit_created_at_idx").on(table.createdAt),
  }),
);

// ─── System Settings ───
export const settings = pgTable("settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
