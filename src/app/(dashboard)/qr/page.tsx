import { redirect } from "next/navigation";
import { Download, QrCode } from "lucide-react";
import { auth } from "@/lib/auth";
import { listLinksByUserId, type ListedLink } from "@/lib/db/queries/links";
import {
  getQrDownloadFilename,
  getQrDownloadHref,
  type QrDownloadFormat,
} from "@/lib/qr/downloads";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";

const PAGE_LIMIT = 60;

type SessionWithUserId = {
  user?: {
    id?: unknown;
  } | null;
} | null;

function getSessionUserId(session: SessionWithUserId): string | null {
  return typeof session?.user?.id === "string" ? session.user.id : null;
}

function getShortUrl(slug: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  return `${baseUrl || "https://linksnap.id"}/${slug}`;
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

function QrCodeCard({ link }: { link: ListedLink }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="flex aspect-square size-12 items-center justify-center rounded-lg border bg-muted">
            <QrCode className="size-6" />
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
        <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/50 p-3">
          <div>
            <p className="text-xs text-muted-foreground">Scans</p>
            <p className="text-lg font-bold tabular-nums">
              {link.clickCount.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Type</p>
            <Badge variant={link.isActive ? "default" : "secondary"}>
              Dynamic
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <DownloadButton format="png" slug={link.slug} />
          <DownloadButton format="svg" slug={link.slug} />
        </div>
      </CardContent>
    </Card>
  );
}

export default async function QrCodesPage() {
  const session = await auth();
  const userId = getSessionUserId(session);
  if (!userId) redirect("/login?callbackUrl=/qr");

  const { items: links } = await listLinksByUserId({
    limit: PAGE_LIMIT,
    page: 1,
    userId,
  });

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">QR Codes</h1>
        <p className="text-sm text-muted-foreground">
          Download dynamic QR codes for your short links.
        </p>
      </div>

      {links.length === 0 ? (
        <QrEmptyState />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <QrCodeCard key={link.id} link={link} />
          ))}
        </div>
      )}
    </>
  );
}
