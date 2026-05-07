import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { AppHeader } from "@/components/dashboard/app-header";
import { auth } from "@/lib/auth";
import { syncSubscriptionStatusForUser } from "@/lib/payments/subscription";

type SessionWithUserId = {
  user?: {
    id?: unknown;
  } | null;
} | null;

function getSessionUserId(session: SessionWithUserId): string | null {
  return typeof session?.user?.id === "string" ? session.user.id : null;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = getSessionUserId(session);

  if (userId) {
    await syncSubscriptionStatusForUser(userId);
  }

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <main className="flex min-h-screen w-full flex-col">
        <AppHeader />
        <div className="flex-1 space-y-6 p-6 pt-4 md:p-8 md:pt-6">{children}</div>
      </main>
    </SidebarProvider>
  );
}
