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
import { usePathname, useRouter } from "next/navigation";
import { Search, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "next-themes";
import { type FormEvent, Fragment, useSyncExternalStore } from "react";
import {
  buildLinksSearchHref,
  LINKS_SEARCH_MAX_LENGTH,
} from "@/lib/links/search";

const subscribeToClientMount = () => () => {};
const getClientMountSnapshot = () => true;
const getServerMountSnapshot = () => false;

export type DashboardBreadcrumb = {
  href?: string;
  label: string;
};

const breadcrumbMap: Record<string, DashboardBreadcrumb[]> = {
  "/dashboard": [{ label: "Dashboard" }],
  "/links": [{ label: "Dashboard", href: "/dashboard" }, { label: "My Links" }],
  "/pages": [{ label: "Dashboard", href: "/dashboard" }, { label: "Link Pages" }],
  "/qr": [{ label: "Dashboard", href: "/dashboard" }, { label: "QR Codes" }],
  "/campaigns": [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Campaigns" },
  ],
  "/analytics": [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Analytics" },
  ],
  "/docs": [
    { label: "Dashboard", href: "/dashboard" },
    { label: "API Docs" },
  ],
  "/settings": [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Settings" },
  ],
  "/settings/billing": [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Settings", href: "/settings" },
    { label: "Billing" },
  ],
};

export function getDashboardBreadcrumbs(pathname: string): DashboardBreadcrumb[] {
  return breadcrumbMap[pathname] ?? [{ label: "Dashboard" }];
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeToClientMount,
    getClientMountSnapshot,
    getServerMountSnapshot,
  );

  const crumbs = getDashboardBreadcrumbs(pathname);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const search = formData.get("search");
    router.push(buildLinksSearchHref(search));
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4 md:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((crumb, i) => (
            <Fragment key={crumb.label}>
              <BreadcrumbItem>
                {i === crumbs.length - 1 ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={crumb.href ?? "#"}>{crumb.label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {i < crumbs.length - 1 && (
                <BreadcrumbSeparator />
              )}
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-2">
        <form className="relative hidden md:block" onSubmit={handleSearchSubmit}>
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            aria-label="Search links"
            className="w-64 pl-8"
            maxLength={LINKS_SEARCH_MAX_LENGTH}
            name="search"
            placeholder="Search links..."
            type="search"
          />
        </form>
        {mounted && (
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        )}
      </div>
    </header>
  );
}
