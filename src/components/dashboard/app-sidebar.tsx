"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOutToLanding } from "@/components/dashboard/sign-out";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard, Link2, Globe, Megaphone, BarChart3, Settings, QrCode, Zap,
  LogOut, User, CreditCard, Sparkles,
} from "lucide-react";
import type { UserPlan } from "@/lib/links/limits";
import { getPlanDefinition } from "@/lib/plans/definitions";

export type AppSidebarUser = {
  email?: string | null;
  image?: string | null;
  name?: string | null;
  plan: UserPlan;
};

export type SidebarDisplayUser = {
  avatarFallback: string;
  avatarUrl?: string;
  email: string;
  name: string;
  planLabel: string;
};

const mainNav = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "My Links", url: "/links", icon: Link2 },
  { title: "Link Pages", url: "/pages", icon: Globe },
  { title: "QR Codes", url: "/qr", icon: QrCode },
  { title: "Campaigns", url: "/campaigns", icon: Megaphone },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

const accountNav = [
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Billing", url: "/settings/billing", icon: CreditCard },
];

function normalizeText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function getAvatarFallback(name: string, email: string): string {
  const words = name === "User" ? [email] : name.split(/\s+/);
  const initials = words
    .flatMap((word) => word.match(/[a-z0-9]/i)?.[0] ?? [])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return initials || "U";
}

export function getSidebarDisplayUser(user: AppSidebarUser): SidebarDisplayUser {
  const email = normalizeText(user.email) ?? "user@email.com";
  const name = normalizeText(user.name) ?? "User";

  return {
    avatarFallback: getAvatarFallback(name, email),
    avatarUrl: normalizeText(user.image) ?? undefined,
    email,
    name,
    planLabel: `${getPlanDefinition(user.plan).name} Plan`,
  };
}

export function isSidebarItemActive(pathname: string, url: string): boolean {
  if (url === "/dashboard") return pathname === "/dashboard";
  if (url === "/settings") return pathname === "/settings";

  return pathname === url || pathname.startsWith(`${url}/`);
}

export function AppSidebar({ user }: { user: AppSidebarUser }) {
  const pathname = usePathname();
  const displayUser = getSidebarDisplayUser(user);

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/dashboard" className="flex items-center gap-2 px-2 py-1.5">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Zap className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                <span className="font-semibold">LinkSnap</span>
                <span className="text-xs text-muted-foreground">
                  {displayUser.planLabel}
                </span>
              </div>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    isActive={isSidebarItemActive(pathname, item.url)}
                    render={<Link href={item.url} />}
                    tooltip={item.title}
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountNav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    isActive={isSidebarItemActive(pathname, item.url)}
                    render={<Link href={item.url} />}
                    tooltip={item.title}
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <div className="rounded-lg border bg-card p-3 text-card-foreground shadow-sm group-data-[collapsible=icon]:hidden">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <span className="text-sm font-medium">Upgrade to Pro</span>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Unlock Link Pages, Smart Rules, and unlimited links.
              </p>
              <Link
                href="/settings/billing"
                className="inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Upgrade Now
              </Link>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
                <Avatar className="size-8 rounded-lg">
                  <AvatarImage src={displayUser.avatarUrl} alt={displayUser.name} />
                  <AvatarFallback className="rounded-lg bg-primary/10 text-xs">
                    {displayUser.avatarFallback}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="text-sm font-semibold">{displayUser.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {displayUser.email}
                  </span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" side="right" sideOffset={4}>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/settings">
                  <DropdownMenuItem>
                    <User className="mr-2 size-4" /> Settings
                  </DropdownMenuItem>
                </Link>
                <Link href="/settings/billing">
                  <DropdownMenuItem>
                    <CreditCard className="mr-2 size-4" /> Billing
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => void signOutToLanding(signOut)}
                >
                  <LogOut className="mr-2 size-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
