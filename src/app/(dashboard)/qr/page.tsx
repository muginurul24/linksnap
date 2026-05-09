import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, CalendarClock, Download, QrCode } from "lucide-react";
import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/auth/session-helpers";
import {
  listQrCodeLinksByUserId,
  type ListedQrCodeLink,
  type QrCodeSort,
} from "@/lib/db/queries/links";
import { findBillingUserById } from "@/lib/db/queries/payments";
import { hydrateRedirectClickCounts } from "@/lib/links/click-count-cache";
import {
  getQrDownloadFilename,
  getQrDownloadHref,
  type QrDownloadFormat,
} from "@/lib/qr/downloads";
import { PlanGate } from "@/components/plan-gate";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";
import type { UserPlan } from "@/lib/links/limits";
import { getQrDownloadQuotaState } from "@/app/(dashboard)/qr/qr-plan-gates";

const PAGE_LIMIT = 60;
const SORT_OPTIONS: Array<{ label: string; value: QrCodeSort }> = [
  { label: "Recently Created", value: "recently-created" },
  { label: "Most Scanned", value: "most-scanned" },
];

type QrCodesPageProps = {
  searchParams?: Promise<{ sort?: string | string[] }>;
};

function getShortUrl(slug: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  return `${baseUrl || "https://www.justqiu.cloud"}/${slug}`;
}

function getQrPreviewHref(slug: string): string {
  return `/api/v1/qr/${encodeURIComponent(slug)}?format=svg&size=160`;
}

function getSortValue(value: string | string[] | undefined): QrCodeSort {
  const sort = Array.isArray(value) ? value.at(0) : value;

  return SORT_OPTIONS.some((option) => option.value === sort)
    ? (sort as QrCodeSort)
    : "recently-created";
}

function formatDate(date: Date | null): string {
  if (!date) return "No scans yet";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

function QrSortControls({ sort }: { sort: QrCodeSort }) {
  return (
    <div
      aria-label="Sort QR codes"
      className="grid grid-cols-2 rounded-lg border bg-background p-1 sm:w-fit"
      role="group"
    >
      {SORT_OPTIONS.map((option) => (
        <Link
          className={buttonVariants({
            className: "h-7 justify-center rounded-md px-2 text-xs",
            size: "sm",
            variant: sort === option.value ? "secondary" : "ghost",
          })}
          href={option.value === "recently-created" ? "/qr" : `/qr?sort=${option.value}`}
          key={option.value}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}

function DownloadButton({
  format,
  slug,
}: {
  format: QrDownloadFormat;
  slug: string;
}) {
  return (
    <a
      aria-label={`Download ${format.toUpperCase()} QR for ${slug}`}
      className={buttonVariants({ size: "sm", variant: "outline" })}
      download={getQrDownloadFilename(slug, format)}
      href={getQrDownloadHref(slug, format)}
    >
      <Download className="size-4" />
      {format.toUpperCase()}
    </a>
  );
}

function QrEmptyState() {
  return (
    <EmptyState
      actionHref="/links/new"
      actionLabel="Create link"
      icon={<QrCode className="size-5" />}
      title="No QR codes yet. Create a link to generate one."
    />
  );
}

function QrCodeCard({
  link,
  links,
  userPlan,
}: {
  link: ListedQrCodeLink;
  links: readonly ListedQrCodeLink[];
  userPlan: UserPlan;
}) {
  const quota = getQrDownloadQuotaState({ link, links, userPlan });
  const analyticsHref = `/analytics?range=30&qrSlug=${encodeURIComponent(link.slug)}`;

  return (
    <Card className="relative overflow-hidden transition-colors hover:border-primary/40 hover:bg-muted/20">
      <Link
        aria-label={`View analytics for QR ${link.slug}`}
        className="absolute inset-0 z-10"
        href={analyticsHref}
      />
      <CardHeader className="relative pb-3">
        <div className="flex items-start gap-3">
          <div className="flex aspect-square size-16 shrink-0 items-center justify-center rounded-lg border bg-background p-2">
            <Image
              alt=""
              className="size-full"
              loading="lazy"
              height={160}
              src={getQrPreviewHref(link.slug)}
              unoptimized
              width={160}
            />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base">
              {link.title || `/${link.slug}`}
            </CardTitle>
            <CardDescription className="truncate font-mono text-xs">
              {getShortUrl(link.slug)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/50 p-3">
          <div>
            <p className="text-xs text-muted-foreground">QR Scans</p>
            <p className="text-lg font-bold tabular-nums">
              {link.qrScanCount.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">30-Day</p>
            <p className="text-lg font-bold tabular-nums">
              {link.qrScansLast30Days.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Clicks</p>
            <p className="text-lg font-bold tabular-nums">
              {link.clickCount.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarClock className="size-3.5" />
          Last scan: {formatDate(link.lastScanAt)}
        </div>
        <PlanGate.Quota
          limit={quota.limit}
          used={quota.used}
          upgradeMessage="QR code quota reached. Upgrade for more QR codes."
          upgradeUrl="/settings/billing?upgrade=qr-codes"
        >
          <div className="relative z-20 flex flex-wrap gap-2">
            <DownloadButton format="png" slug={link.slug} />
            <DownloadButton format="svg" slug={link.slug} />
            <Link
              className={buttonVariants({ size: "sm", variant: "outline" })}
              href={analyticsHref}
            >
              <BarChart3 className="size-4" />
              View Analytics
            </Link>
          </div>
        </PlanGate.Quota>
      </CardContent>
    </Card>
  );
}

export default async function QrCodesPage({ searchParams }: QrCodesPageProps) {
  const session = await auth();
  const userId = getSessionUserId(session);
  if (!userId) redirect("/login?callbackUrl=/qr");

  const params = (await searchParams) ?? {};
  const sort = getSortValue(params.sort);
  const [linkResult, billingUser] = await Promise.all([
    listQrCodeLinksByUserId({
      limit: PAGE_LIMIT,
      page: 1,
      sort,
      userId,
    }),
    findBillingUserById(userId),
  ]);
  const links = await hydrateRedirectClickCounts(linkResult.items);
  const userPlan = billingUser?.plan ?? "FREE";

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">QR Codes</h1>
        <p className="text-sm text-muted-foreground">
          Download dynamic QR codes for your short links.
        </p>
      </div>

      <QrSortControls sort={sort} />

      {links.length === 0 ? (
        <QrEmptyState />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <QrCodeCard
              key={link.id}
              link={link}
              links={links}
              userPlan={userPlan}
            />
          ))}
        </div>
      )}
    </>
  );
}
