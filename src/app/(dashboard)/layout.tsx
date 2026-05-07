import { ThemeProvider } from "next-themes";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar, type AppSidebarUser } from "@/components/dashboard/app-sidebar";
import { AppHeader } from "@/components/dashboard/app-header";
import { auth } from "@/lib/auth";
import { findBillingUserById } from "@/lib/db/queries/payments";
import { syncSubscriptionStatusForUser } from "@/lib/payments/subscription";

type SessionWithUserId = {
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
  field: "email" | "image" | "name",
): string | null {
  const value = session?.user?.[field];
  return typeof value === "string" ? value : null;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = getSessionUserId(session);
  let sidebarUser: AppSidebarUser = {
    email: getSessionString(session, "email"),
    image: getSessionString(session, "image"),
    name: getSessionString(session, "name"),
    plan: "FREE",
  };

  if (userId) {
    await syncSubscriptionStatusForUser(userId);
    const billingUser = await findBillingUserById(userId);
    sidebarUser = {
      email: billingUser?.email ?? sidebarUser.email,
      image: sidebarUser.image,
      name: billingUser?.name ?? sidebarUser.name,
      plan: billingUser?.plan ?? "FREE",
    };
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <SidebarProvider defaultOpen>
          <AppSidebar user={sidebarUser} />
          <main className="flex min-h-screen w-full flex-col">
            <AppHeader />
            <div className="flex-1 space-y-6 p-6 pt-4 md:p-8 md:pt-6">
              {children}
            </div>
          </main>
        </SidebarProvider>
      </TooltipProvider>
      <Toaster richColors closeButton position="top-right" />
    </ThemeProvider>
  );
}
