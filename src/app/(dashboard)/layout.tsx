"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { AppHeader } from "@/components/dashboard/app-header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
