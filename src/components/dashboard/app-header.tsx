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
import { usePlan } from "@/lib/auth/plan-context";
import { getPlanDefinition } from "@/lib/plans/definitions";
import {
  type ChangeEvent,
  type FormEvent,
  Fragment,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  buildLinksSearchHref,
  getLinksSearchQuery,
  LINKS_SEARCH_DEBOUNCE_MS,
  LINKS_SEARCH_MAX_LENGTH,
  shouldNavigateLinksSearch,
} from "@/lib/links/search";

const subscribeToClientMount = () => () => {};
const getClientMountSnapshot = () => true;
const getServerMountSnapshot = () => false;

function getCurrentLinksSearchHref(pathname: string): string {
  if (pathname !== "/links" || typeof window === "undefined") return pathname;

  const params = new URLSearchParams(window.location.search);
  return buildLinksSearchHref(params.get("search"));
}

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
  "/help": [{ label: "Dashboard", href: "/dashboard" }, { label: "Help" }],
};

export function getDashboardBreadcrumbs(pathname: string): DashboardBreadcrumb[] {
  return breadcrumbMap[pathname] ?? [{ label: "Dashboard" }];
}

export function getBreadcrumbItemVisibilityClass(
  index: number,
  total: number,
): string | undefined {
  return index < total - 1 ? "hidden md:inline-flex" : undefined;
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const userPlan = usePlan();
  const planLabel = getPlanDefinition(userPlan).name;
  const [searchValue, setSearchValue] = useState("");
  const hasEditedSearch = useRef(false);
  const mounted = useSyncExternalStore(
    subscribeToClientMount,
    getClientMountSnapshot,
    getServerMountSnapshot,
  );

  const crumbs = getDashboardBreadcrumbs(pathname);

  useEffect(() => {
    if (pathname !== "/links" || typeof window === "undefined") return;
    if (hasEditedSearch.current) return;

    const params = new URLSearchParams(window.location.search);
    setSearchValue(getLinksSearchQuery(params.get("search")) ?? "");
  }, [pathname]);

  useEffect(() => {
    if (!hasEditedSearch.current) return;
    if (pathname !== "/links" && !getLinksSearchQuery(searchValue)) return;

    const timeoutId = window.setTimeout(() => {
      const href = buildLinksSearchHref(searchValue);
      const currentHref = getCurrentLinksSearchHref(pathname);

      if (shouldNavigateLinksSearch(currentHref, searchValue)) {
        router.replace(href, { scroll: false });
      }
    }, LINKS_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [pathname, router, searchValue]);

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    hasEditedSearch.current = true;
    setSearchValue(event.target.value);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const search = formData.get("search");
    hasEditedSearch.current = true;
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
              <BreadcrumbItem
                className={getBreadcrumbItemVisibilityClass(i, crumbs.length)}
              >
                {i === crumbs.length - 1 ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={crumb.href ?? "#"}>{crumb.label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {i < crumbs.length - 1 && (
                <BreadcrumbSeparator className="hidden md:inline-flex" />
              )}
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-2">
        <span className="hidden rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">
          {planLabel}
        </span>
        <form className="relative hidden md:block" onSubmit={handleSearchSubmit}>
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            aria-label="Search links"
            className="w-64 pl-8"
            maxLength={LINKS_SEARCH_MAX_LENGTH}
            name="search"
            onChange={handleSearchChange}
            placeholder="Search links..."
            type="search"
            value={searchValue}
          />
        </form>
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        )}
      </div>
    </header>
  );
}
