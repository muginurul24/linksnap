import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AdminLoading from "@/app/(dashboard)/admin/loading";
import AdminAuditLogLoading from "@/app/(dashboard)/admin/audit-log/loading";
import AdminAnalyticsLoading from "@/app/(dashboard)/admin/analytics/loading";
import AdminUsersLoading from "@/app/(dashboard)/admin/users/loading";
import AdminUserDetailLoading from "@/app/(dashboard)/admin/users/[id]/loading";

const loadingStates = [
  AdminLoading,
  AdminUsersLoading,
  AdminUserDetailLoading,
  AdminAnalyticsLoading,
  AdminAuditLogLoading,
] as const;

describe("admin loading states", () => {
  for (const LoadingState of loadingStates) {
    it("should render skeleton placeholders while admin content loads", () => {
      const markup = renderToStaticMarkup(<LoadingState />);

      expect(markup).toContain('data-slot="skeleton"');
      expect(markup).toContain("animate-pulse");
    });
  }
});
