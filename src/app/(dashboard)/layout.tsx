import { ThemeProvider } from "next-themes";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar, type AppSidebarUser } from "@/components/dashboard/app-sidebar";
import { AppHeader } from "@/components/dashboard/app-header";
import { SessionTimeout } from "@/components/dashboard/session-timeout";
import { auth } from "@/lib/auth";
import { PlanProvider } from "@/lib/auth/plan-context";
import type { UserPlan } from "@/lib/links/limits";
import { logger } from "@/lib/observability/logger";
import { getDashboardSubscriptionSnapshot } from "@/lib/payments/dashboard-subscription-cache";

type SessionWithUserId = {
  expires?: unknown;
  user?: {
    email?: unknown;
    id?: unknown;
    image?: unknown;
    name?: unknown;
  } | null;
} | null;

function getSessionUserId(session: SessionWithUserId): string | null {
  return typeof session?.user?.id === "string" ? session.user.id : null;
}

function getSessionString(
  session: SessionWithUserId,
  field: "email" | "expires" | "image" | "name",
): string | null {
  const value = field === "expires" ? session?.expires : session?.user?.[field];
  return typeof value === "string" ? value : null;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = getSessionUserId(session);
  let userPlan: UserPlan = "FREE";
  let sidebarUser: AppSidebarUser = {
    email: getSessionString(session, "email"),
    image: getSessionString(session, "image"),
    name: getSessionString(session, "name"),
  };

  if (userId) {
    try {
      const billingUser = await getDashboardSubscriptionSnapshot(userId);
      sidebarUser = {
        email: billingUser?.email ?? sidebarUser.email,
        image: sidebarUser.image,
        name: billingUser?.name ?? sidebarUser.name,
      };
      userPlan = billingUser?.plan ?? "FREE";
    } catch (error) {
      logger.error("dashboard_subscription_snapshot_load_failed", { error, userId });
    }
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <SidebarProvider defaultOpen defaultOpenMobile={false}>
          <PlanProvider userPlan={userPlan}>
            <AppSidebar user={sidebarUser} />
            <main className="flex min-h-screen w-full flex-col">
              <AppHeader />
              <div className="flex-1 space-y-6 p-6 pt-4 md:p-8 md:pt-6">
                {children}
              </div>
              <SessionTimeout expiresAt={getSessionString(session, "expires")} />
            </main>
          </PlanProvider>
        </SidebarProvider>
      </TooltipProvider>
      <Toaster richColors closeButton position="top-right" />
    </ThemeProvider>
  );
}
