"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarClock,
  Eye,
  Link2,
  Loader2,
  Monitor,
  QrCode,
  Smartphone,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CountdownTimer } from "@/components/link-page/countdown-timer";
import {
  formatClickCount,
  getReadableTextColor,
  getSafeHexColor,
} from "@/components/link-page/link-page-utils";
import { cn } from "@/lib/utils";

type ApiEnvelope<T> =
  | { data: T; success: true }
  | {
      error: {
        code: string;
        message?: string;
      };
      success: false;
    };

type LinkPageApiConfig = {
  brandName: string;
  countdownTarget: string | null;
  ctaColor: string;
  ctaText: string;
  description: string | null;
  ogImage: string | null;
  showCountdown: boolean;
  showQrCode: boolean;
  showSocialProof: boolean;
  theme: string;
  title: string;
};

type LinkPageApiResponse = {
  linkId: string;
  linkPage: LinkPageApiConfig | null;
};

type LinkPagePreviewConfig = Omit<LinkPageApiConfig, "countdownTarget"> & {
  brandLogo: string | null;
  countdownTarget: Date | null;
};

type LinkPagePreviewDialogProps = {
  link: {
    clickCount: number;
    destinationUrl: string;
    hasLinkPage: boolean;
    id: string;
    shortUrl: string;
    slug: string;
  };
};

type PreviewMode = "desktop" | "mobile";

type PreviewStatus =
  | { page: LinkPagePreviewConfig; status: "ready" }
  | { message: string; status: "error" }
  | { status: "idle" | "loading" };

const previewThemeClasses = {
  auto: {
    card:
      "border-zinc-200 bg-white text-zinc-950 shadow-sm dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-50",
    frame: "border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-neutral-800",
    muted: "text-zinc-600 dark:text-neutral-300",
    qrFrame: "border-zinc-200 bg-white dark:border-white/10",
    screen: "bg-zinc-100 text-zinc-950 dark:bg-neutral-950 dark:text-neutral-50",
  },
  dark: {
    card: "border-white/10 bg-neutral-900 text-neutral-50 shadow-sm",
    frame: "border-white/10 bg-neutral-800",
    muted: "text-neutral-300",
    qrFrame: "border-white/10 bg-white",
    screen: "bg-neutral-950 text-neutral-50",
  },
  light: {
    card: "border-zinc-200 bg-white text-zinc-950 shadow-sm",
    frame: "border-zinc-200 bg-zinc-50",
    muted: "text-zinc-600",
    qrFrame: "border-zinc-200 bg-white",
    screen: "bg-zinc-100 text-zinc-950",
  },
} as const;

function normalizePreviewTheme(theme: string): keyof typeof previewThemeClasses {
  if (theme === "dark" || theme === "light") return theme;

  return "auto";
}

function parseOptionalDate(value: string | null): Date | null {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toLinkPagePreviewConfig(
  config: LinkPageApiConfig,
): LinkPagePreviewConfig {
  return {
    ...config,
    brandLogo: null,
    countdownTarget: parseOptionalDate(config.countdownTarget),
  };
}

function apiErrorMessage(body: ApiEnvelope<LinkPageApiResponse>): string {
  if (body.success) return "Unable to load Link Page preview.";

  const messages: Record<string, string> = {
    AUTHENTICATION_REQUIRED: "Please sign in again to preview this Link Page.",
    FORBIDDEN: "You do not have access to this Link Page.",
    LINK_NOT_FOUND: "This link no longer exists.",
    RATE_LIMITED: "Too many preview requests. Try again shortly.",
  };

  return messages[body.error.code] ?? body.error.message ?? "Unable to load preview.";
}

function PreviewModeToggle({
  mode,
  onModeChange,
}: {
  mode: PreviewMode;
  onModeChange: (mode: PreviewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-lg bg-muted p-1">
      <button
        type="button"
        aria-pressed={mode === "mobile"}
        onClick={() => onModeChange("mobile")}
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
          mode === "mobile" && "bg-background text-foreground shadow-sm",
        )}
      >
        <Smartphone className="size-3.5" aria-hidden="true" />
        Mobile
      </button>
      <button
        type="button"
        aria-pressed={mode === "desktop"}
        onClick={() => onModeChange("desktop")}
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
          mode === "desktop" && "bg-background text-foreground shadow-sm",
        )}
      >
        <Monitor className="size-3.5" aria-hidden="true" />
        Desktop
      </button>
    </div>
  );
}

function PreviewSurface({
  clickCount,
  destinationUrl,
  page,
  qrCodeDataUrl,
  shortUrl,
}: {
  clickCount: number;
  destinationUrl: string;
  page: LinkPagePreviewConfig;
  qrCodeDataUrl: string | null;
  shortUrl: string;
}) {
  const theme = previewThemeClasses[normalizePreviewTheme(page.theme)];
  const ctaColor = getSafeHexColor(page.ctaColor);
  const ctaTextColor = getReadableTextColor(ctaColor);
  const countdownTarget =
    page.showCountdown === true ? page.countdownTarget : null;
  const brandInitial = page.brandName.trim().charAt(0).toUpperCase() || "L";

  return (
    <main className={cn("min-h-[640px] px-4 py-6", theme.screen)}>
      <section className="mx-auto flex min-h-[592px] w-full max-w-[480px] items-center">
        <article className={cn("w-full overflow-hidden rounded-lg border", theme.card)}>
          {page.ogImage ? (
            <div className={cn("border-b", theme.frame)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={page.ogImage}
                alt={`${page.title} preview`}
                className="aspect-[16/9] w-full object-cover"
              />
            </div>
          ) : null}

          <div className="space-y-5 p-5">
            <header className="flex min-w-0 items-center gap-3">
              <div
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold",
                  theme.frame,
                )}
                aria-hidden="true"
              >
                {brandInitial}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{page.brandName}</p>
                <p className={cn("truncate text-xs", theme.muted)}>
                  {shortUrl.replace(/^https?:\/\//, "")}
                </p>
              </div>
            </header>

            <div className="space-y-3">
              <h2 className="break-words text-2xl font-semibold leading-tight tracking-normal">
                {page.title}
              </h2>
              {page.description ? (
                <p className={cn("break-words text-sm leading-6", theme.muted)}>
                  {page.description}
                </p>
              ) : null}
            </div>

            <a
              href={destinationUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              style={{ backgroundColor: ctaColor, color: ctaTextColor }}
            >
              <span className="min-w-0 truncate">{page.ctaText}</span>
              <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
            </a>

            {countdownTarget || page.showSocialProof ? (
              <div className="grid gap-3">
                {countdownTarget ? (
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 text-sm",
                      theme.frame,
                    )}
                  >
                    <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
                    <p className="min-w-0 break-words">
                      Offer ends in <CountdownTimer targetDate={countdownTarget} />
                    </p>
                  </div>
                ) : null}

                {page.showSocialProof ? (
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 text-sm",
                      theme.frame,
                    )}
                  >
                    <UsersRound className="size-4 shrink-0" aria-hidden="true" />
                    <p>{formatClickCount(clickCount)}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {qrCodeDataUrl ? (
              <div className={cn("rounded-lg border p-4", theme.frame)}>
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className={cn("rounded-lg border p-2", theme.qrFrame)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrCodeDataUrl}
                      alt={`QR code for ${shortUrl}`}
                      className="size-40"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <QrCode className="size-3.5" aria-hidden="true" />
                    <span className="max-w-[15rem] truncate font-mono">{shortUrl}</span>
                  </div>
                </div>
              </div>
            ) : null}

            <footer className="flex items-center justify-center gap-2 text-xs text-zinc-500">
              <Link2 className="size-3.5" aria-hidden="true" />
              <span>Powered by LinkSnap</span>
            </footer>
          </div>
        </article>
      </section>
    </main>
  );
}

export function LinkPagePreviewDialog({ link }: LinkPagePreviewDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<PreviewMode>("mobile");
  const [status, setStatus] = useState<PreviewStatus>({ status: "idle" });
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  function handleOpenChange(open: boolean): void {
    setIsOpen(open);
    setQrCodeDataUrl(null);
    setStatus(open && link.hasLinkPage ? { status: "loading" } : { status: "idle" });
  }

  useEffect(() => {
    if (!isOpen || !link.hasLinkPage) return;

    const abortController = new AbortController();

    async function loadPreview(): Promise<void> {
      try {
        const response = await fetch(`/api/v1/links/${link.id}/page`, {
          headers: { "X-Requested-With": "XMLHttpRequest" },
          signal: abortController.signal,
        });
        const body = (await response.json()) as ApiEnvelope<LinkPageApiResponse>;

        if (!response.ok || !body.success) {
          setStatus({ status: "error", message: apiErrorMessage(body) });
          return;
        }

        if (!body.data.linkPage) {
          setStatus({ status: "error", message: "No Link Page is configured." });
          return;
        }

        setStatus({
          page: toLinkPagePreviewConfig(body.data.linkPage),
          status: "ready",
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus({ status: "error", message: "Unable to load preview." });
      }
    }

    void loadPreview();

    return () => abortController.abort();
  }, [isOpen, link.hasLinkPage, link.id]);

  useEffect(() => {
    if (status.status !== "ready" || !status.page.showQrCode) return;

    let isCancelled = false;

    async function generateQrCode(): Promise<void> {
      const dataUrl = await QRCode.toDataURL(link.shortUrl, {
        color: { dark: "#111827", light: "#ffffff" },
        errorCorrectionLevel: "M",
        margin: 1,
        width: 176,
      });

      if (!isCancelled) setQrCodeDataUrl(dataUrl);
    }

    void generateQrCode();

    return () => {
      isCancelled = true;
    };
  }, [link.shortUrl, status]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={!link.hasLinkPage}
            aria-label={`Preview Link Page for ${link.slug}`}
            title={link.hasLinkPage ? "Preview Link Page" : "No Link Page"}
          />
        }
      >
        <Eye className="size-4" aria-hidden="true" />
      </DialogTrigger>
      <DialogContent
        className={cn(
          "max-h-[92vh] overflow-hidden p-0 sm:max-w-5xl",
          mode === "mobile" && "sm:max-w-lg",
        )}
      >
        <DialogHeader className="border-b px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle>Link Page preview</DialogTitle>
              <DialogDescription className="truncate font-mono text-xs">
                /{link.slug}
              </DialogDescription>
            </div>
            <PreviewModeToggle mode={mode} onModeChange={setMode} />
          </div>
        </DialogHeader>

        <div className="max-h-[calc(92vh-5rem)] overflow-auto bg-muted/40 p-4">
          <div
            className={cn(
              "mx-auto overflow-hidden rounded-lg border bg-background shadow-sm transition-[max-width] duration-200",
              mode === "mobile" ? "max-w-[390px]" : "max-w-[860px]",
            )}
          >
            {status.status === "loading" || status.status === "idle" ? (
              <div className="flex h-[420px] items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" />
                Loading preview
              </div>
            ) : null}

            {status.status === "error" ? (
              <div className="flex h-[420px] items-center justify-center p-6">
                <div className="max-w-sm rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertCircle className="size-4" aria-hidden="true" />
                    Preview unavailable
                  </div>
                  <p className="mt-2 text-destructive/80">{status.message}</p>
                </div>
              </div>
            ) : null}

            {status.status === "ready" ? (
              <PreviewSurface
                clickCount={link.clickCount}
                destinationUrl={link.destinationUrl}
                page={status.page}
                qrCodeDataUrl={qrCodeDataUrl}
                shortUrl={link.shortUrl}
              />
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
