"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { usePathname } from "next/navigation";
import { Search, Bell, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const subscribeToClientMount = () => () => {};
const getClientMountSnapshot = () => true;
const getServerMountSnapshot = () => false;

const breadcrumbMap: Record<string, { label: string; href?: string }[]> = {
  "/": [{ label: "Dashboard" }],
  "/links": [{ label: "Dashboard", href: "/" }, { label: "My Links" }],
  "/pages": [{ label: "Dashboard", href: "/" }, { label: "Link Pages" }],
  "/qr": [{ label: "Dashboard", href: "/" }, { label: "QR Codes" }],
  "/campaigns": [{ label: "Dashboard", href: "/" }, { label: "Campaigns" }],
  "/analytics": [{ label: "Dashboard", href: "/" }, { label: "Analytics" }],
  "/settings": [{ label: "Dashboard", href: "/" }, { label: "Settings" }],
  "/settings/billing": [{ label: "Dashboard", href: "/" }, { label: "Settings", href: "/settings" }, { label: "Billing" }],
};

export function AppHeader() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeToClientMount,
    getClientMountSnapshot,
    getServerMountSnapshot,
  );

  const crumbs = breadcrumbMap[pathname] ?? [{ label: "Dashboard" }];

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4 md:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((crumb, i) => (
            <BreadcrumbItem key={crumb.label}>
              {i === crumbs.length - 1 ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <>
                  <BreadcrumbLink href={crumb.href ?? "#"}>{crumb.label}</BreadcrumbLink>
                  <BreadcrumbSeparator />
                </>
              )}
            </BreadcrumbItem>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input type="search" placeholder="Search links..." className="w-64 pl-8" />
        </div>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Bell className="size-4" />
        </Button>
        {mounted && (
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        )}
      </div>
    </header>
  );
}
