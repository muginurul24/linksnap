CREATE TYPE "public"."click_event_type" AS ENUM('DIRECT_REDIRECT', 'LINK_PAGE_VIEW', 'LINK_PAGE_CTA_CLICK');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'SETTLEMENT', 'CANCEL', 'DENY', 'EXPIRE');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('FREE', 'PRO', 'BUSINESS');--> statement-breakpoint
CREATE TYPE "public"."rule_type" AS ENUM('GEO', 'DEVICE', 'TIME', 'LANGUAGE');--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"target_user_id" uuid,
	"metadata" jsonb,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"key_prefix" varchar(32) NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"utm_source" varchar(100),
	"utm_medium" varchar(100),
	"utm_campaign" varchar(100),
	"utm_term" varchar(100),
	"utm_content" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "click_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"link_id" uuid NOT NULL,
	"rule_id" uuid,
	"event_type" "click_event_type" DEFAULT 'DIRECT_REDIRECT' NOT NULL,
	"link_page_has_countdown" boolean DEFAULT false NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"ip_hash" varchar(64),
	"country" varchar(100),
	"city" varchar(100),
	"referrer" text,
	"user_agent" text,
	"device" varchar(20),
	"browser" varchar(50),
	"os" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "link_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"link_id" uuid NOT NULL,
	"brand_name" varchar(100) NOT NULL,
	"brand_logo" text,
	"title" varchar(255) NOT NULL,
	"description" text,
	"og_image" text,
	"cta_text" varchar(50) DEFAULT 'Continue' NOT NULL,
	"cta_color" varchar(7) DEFAULT '#6366f1' NOT NULL,
	"show_countdown" boolean DEFAULT false,
	"countdown_target" timestamp,
	"show_social_proof" boolean DEFAULT true,
	"show_qr_code" boolean DEFAULT true,
	"theme" varchar(20) DEFAULT 'auto' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "link_pages_link_id_unique" UNIQUE("link_id")
);
--> statement-breakpoint
CREATE TABLE "links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" varchar(50) NOT NULL,
	"destination_url" text NOT NULL,
	"title" varchar(255),
	"has_link_page" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"scheduled_at" timestamp,
	"expires_at" timestamp,
	"click_count" integer DEFAULT 0 NOT NULL,
	"campaign_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "links_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reset_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smart_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"link_id" uuid NOT NULL,
	"type" "rule_type" NOT NULL,
	"condition" jsonb NOT NULL,
	"destination_url" text NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "split_test_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"split_test_id" uuid NOT NULL,
	"destination_url" text NOT NULL,
	"weight" integer DEFAULT 50 NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "split_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"link_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "split_tests_link_id_unique" UNIQUE("link_id")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan" "plan" NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"current_period_start" timestamp NOT NULL,
	"current_period_end" timestamp NOT NULL,
	"canceled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"order_id" varchar(100) NOT NULL,
	"plan" "plan" NOT NULL,
	"duration" varchar(10) NOT NULL,
	"gross_amount_usd" real NOT NULL,
	"gross_amount_idr" integer NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"payment_method" varchar(50),
	"snap_token" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255),
	"google_id" varchar(255),
	"name" varchar(255),
	"avatar_url" text,
	"email_verified" timestamp,
	"otp_code" varchar(6),
	"otp_expires_at" timestamp,
	"refresh_token_hash" text,
	"two_factor_secret" text,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"two_factor_backup_code_hashes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notifications" jsonb DEFAULT '{"linkPerformanceAlerts":true,"paymentConfirmations":true,"productUpdates":true,"weeklyAnalyticsReport":true}'::jsonb NOT NULL,
	"plan" "plan" DEFAULT 'FREE' NOT NULL,
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_rule_id_smart_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."smart_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_pages" ADD CONSTRAINT "link_pages_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reset_tokens" ADD CONSTRAINT "reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_rules" ADD CONSTRAINT "smart_rules_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_test_variants" ADD CONSTRAINT "split_test_variants_split_test_id_split_tests_id_fk" FOREIGN KEY ("split_test_id") REFERENCES "public"."split_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_tests" ADD CONSTRAINT "split_tests_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_admin_user_idx" ON "admin_audit_log" USING btree ("admin_user_id");--> statement-breakpoint
CREATE INDEX "audit_action_idx" ON "admin_audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_created_at_idx" ON "admin_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_key_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_keys_user_id_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "campaigns_user_idx" ON "campaigns" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaigns_slug_idx" ON "campaigns" USING btree ("user_id","slug");--> statement-breakpoint
CREATE INDEX "ce_link_id_idx" ON "click_events" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "ce_ts_idx" ON "click_events" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "ce_link_ts_idx" ON "click_events" USING btree ("link_id","timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "slug_idx" ON "links" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "links_user_id_idx" ON "links" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "links_campaign_idx" ON "links" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "links_user_created_idx" ON "links" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reset_tokens_token_hash_idx" ON "reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "reset_tokens_user_id_idx" ON "reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rules_link_id_idx" ON "smart_rules" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "tx_payment_method_idx" ON "transactions" USING btree ("payment_method");--> statement-breakpoint
CREATE INDEX "tx_user_idx" ON "transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tx_settled_user_idx" ON "transactions" USING btree ("user_id") WHERE "transactions"."status" = 'SETTLEMENT';