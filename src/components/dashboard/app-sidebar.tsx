"use client";

import { usePathname } from "next/navigation";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard, Link2, Globe, Megaphone, BarChart3, Settings, QrCode, Zap,
  LogOut, User, CreditCard, Sparkles,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";

const mainNav = [
  { title: "Overview", url: "/", icon: LayoutDashboard },
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

export function AppSidebar() {
  const pathname = usePathname();

  const isActive = (url: string) => {
    if (url === "/") return pathname === "/";
    return pathname.startsWith(url);
  };

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <a href="/" className="flex items-center gap-2 px-2 py-1.5">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Zap className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                <span className="font-semibold">LinkSnap</span>
                <span className="text-xs text-muted-foreground">Free Plan</span>
              </div>
            </a>
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
                  <SidebarMenuButton isActive={isActive(item.url)} tooltip={item.title}>
                    <a href={item.url} className="flex w-full items-center gap-2">
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </a>
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
                  <SidebarMenuButton isActive={isActive(item.url)} tooltip={item.title}>
                    <a href={item.url} className="flex w-full items-center gap-2">
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </a>
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
              <a
                href="/settings/billing"
                className="inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Upgrade Now
              </a>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <SidebarMenuButton size="lg">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarImage src="/avatars/user.png" alt="User" />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-xs">RF</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="text-sm font-semibold">Rafi</span>
                    <span className="text-xs text-muted-foreground">rafi@email.com</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" side="right" sideOffset={4}>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <a href="/settings">
                  <DropdownMenuItem>
                    <User className="mr-2 size-4" /> Settings
                  </DropdownMenuItem>
                </a>
                <a href="/settings/billing">
                  <DropdownMenuItem>
                    <CreditCard className="mr-2 size-4" /> Billing
                  </DropdownMenuItem>
                </a>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
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
