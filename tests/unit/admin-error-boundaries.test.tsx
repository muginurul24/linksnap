import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import AdminError from "@/app/(dashboard)/admin/error";
import AdminAuditLogError from "@/app/(dashboard)/admin/audit-log/error";
import AdminAnalyticsError from "@/app/(dashboard)/admin/analytics/error";
import AdminUsersError from "@/app/(dashboard)/admin/users/error";
import AdminUserDetailError from "@/app/(dashboard)/admin/users/[id]/error";

const testError = Object.assign(new Error("Admin test error"), {
  digest: "test-digest",
});

const boundaries = [
  {
    Component: AdminError,
    message: "Admin panel is temporarily unavailable",
  },
  {
    Component: AdminUsersError,
    message: "User management is temporarily unavailable",
  },
  {
    Component: AdminUserDetailError,
    message: "User details are temporarily unavailable",
  },
  {
    Component: AdminAnalyticsError,
    message: "System analytics are temporarily unavailable",
  },
  {
    Component: AdminAuditLogError,
    message: "Audit log is temporarily unavailable",
  },
] as const;

describe("admin error boundaries", () => {
  for (const { Component, message } of boundaries) {
    it(`should render recovery controls when ${message}`, () => {
      const markup = renderToStaticMarkup(
        <Component error={testError} reset={vi.fn()} />,
      );

      expect(markup).toContain(message);
      expect(markup).toContain("Try again");
    });
  }
});
