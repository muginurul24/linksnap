import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import AdminAnalyticsError from "@/app/(dashboard)/admin/analytics/error";
import AdminUserDetailError from "@/app/(dashboard)/admin/users/[id]/error";
import AdminUsersError from "@/app/(dashboard)/admin/users/error";
import AnalyticsError from "@/app/(dashboard)/analytics/error";
import NewLinkError from "@/app/(dashboard)/links/new/error";
import BillingError from "@/app/(dashboard)/settings/billing/error";

const sensitiveError = Object.assign(
  new Error("Sensitive database stack with token=secret"),
  { digest: "request-digest" },
);

const prioritizedBoundaries = [
  {
    Component: AnalyticsError,
    fallback: "Back to links",
    message: "Analytics are temporarily unavailable",
  },
  {
    Component: AdminUsersError,
    fallback: "Back to admin",
    message: "User management is temporarily unavailable",
  },
  {
    Component: AdminUserDetailError,
    fallback: "Back to users",
    message: "User details are temporarily unavailable",
  },
  {
    Component: AdminAnalyticsError,
    fallback: "Back to admin",
    message: "System analytics are temporarily unavailable",
  },
  {
    Component: NewLinkError,
    fallback: "Back to links",
    message: "Link creation is temporarily unavailable",
  },
  {
    Component: BillingError,
    fallback: "Back to settings",
    message: "Billing is temporarily unavailable",
  },
] as const;

describe("dashboard route error boundaries", () => {
  for (const { Component, fallback, message } of prioritizedBoundaries) {
    it(`should render friendly recovery controls for ${message}`, () => {
      const markup = renderToStaticMarkup(
        <Component error={sensitiveError} reset={vi.fn()} />,
      );

      expect(markup).toContain(message);
      expect(markup).toContain("Try again");
      expect(markup).toContain(fallback);
      expect(markup).not.toContain(sensitiveError.message);
      expect(markup).not.toContain("token=secret");
    });
  }
});
