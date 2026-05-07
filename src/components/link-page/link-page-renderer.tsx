import QRCode from "qrcode";
import {
  ArrowUpRight,
  CalendarClock,
  Link2,
  QrCode,
  UsersRound,
} from "lucide-react";
import { CountdownTimer } from "@/components/link-page/countdown-timer";
import {
  formatClickCount,
  getReadableTextColor,
  getSafeHexColor,
} from "@/components/link-page/link-page-utils";
import { getCspNonce } from "@/lib/security/server-nonce";
import { cn } from "@/lib/utils";

type LinkPageTheme = "auto" | "dark" | "light";

type ThemeClasses = {
  card: string;
  footer: string;
  frame: string;
  iconFrame: string;
  muted: string;
  qrFrame: string;
  screen: string;
};

const THEME_CLASSES: Record<LinkPageTheme, ThemeClasses> = {
  auto: {
    card:
      "border-zinc-200 bg-white text-zinc-950 shadow-sm dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-50",
    footer: "text-zinc-500 dark:text-neutral-400",
    frame: "border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-neutral-800",
    iconFrame:
      "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-300",
    muted: "text-zinc-600 dark:text-neutral-300",
    qrFrame: "border-zinc-200 bg-white dark:border-white/10 dark:bg-white",
    screen: "bg-zinc-100 text-zinc-950 dark:bg-neutral-950 dark:text-neutral-50",
  },
  dark: {
    card: "border-white/10 bg-neutral-900 text-neutral-50 shadow-sm",
    footer: "text-neutral-400",
    frame: "border-white/10 bg-neutral-800",
    iconFrame: "border-white/10 bg-neutral-800 text-neutral-300",
    muted: "text-neutral-300",
    qrFrame: "border-white/10 bg-white",
    screen: "bg-neutral-950 text-neutral-50",
  },
  light: {
    card: "border-zinc-200 bg-white text-zinc-950 shadow-sm",
    footer: "text-zinc-500",
    frame: "border-zinc-200 bg-zinc-50",
    iconFrame: "border-zinc-200 bg-zinc-100 text-zinc-600",
    muted: "text-zinc-600",
    qrFrame: "border-zinc-200 bg-white",
    screen: "bg-zinc-100 text-zinc-950",
  },
};

export type LinkPageRendererConfig = {
  brandLogo: string | null;
  brandName: string;
  countdownTarget: Date | null;
  ctaColor: string;
  ctaText: string;
  description: string | null;
  ogImage: string | null;
  showCountdown: boolean | null;
  showQrCode: boolean | null;
  showSocialProof: boolean | null;
  theme: string;
  title: string;
};

type LinkPageRendererProps = {
  clickCount: number;
  ctaUrl: string;
  page: LinkPageRendererConfig;
  shortUrl: string;
};

function normalizeTheme(theme: string): LinkPageTheme {
  if (theme === "dark" || theme === "light") return theme;

  return "auto";
}

async function buildQrCodeDataUrl(value: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(value, {
      color: {
        dark: "#111827",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
      margin: 1,
      width: 176,
    });
  } catch (error) {
    console.error("[link-page-renderer] failed to generate QR code", error);
    return null;
  }
}

export async function LinkPageRenderer({
  clickCount,
  ctaUrl,
  page,
  shortUrl,
}: LinkPageRendererProps) {
  const theme = normalizeTheme(page.theme);
  const themeClasses = THEME_CLASSES[theme];
  const nonce = await getCspNonce();
  const ctaColor = getSafeHexColor(page.ctaColor);
  const ctaTextColor = getReadableTextColor(ctaColor);
  const countdownTarget =
    page.showCountdown === true ? page.countdownTarget : null;
  const qrCodeDataUrl =
    page.showQrCode === false ? null : await buildQrCodeDataUrl(shortUrl);
  const brandInitial = page.brandName.trim().charAt(0).toUpperCase() || "L";

  return (
    <main className={cn("min-h-screen px-4 py-6 sm:py-10", themeClasses.screen)}>
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[480px] items-center sm:min-h-[calc(100vh-5rem)]">
        <article
          className={cn(
            "w-full overflow-hidden rounded-lg border",
            themeClasses.card,
          )}
        >
          {page.ogImage ? (
            <div className={cn("border-b", themeClasses.frame)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={page.ogImage}
                alt={`${page.title} preview`}
                className="aspect-[16/9] w-full object-cover"
              />
            </div>
          ) : null}

          <div className="space-y-6 p-5 sm:p-6">
            <header className="flex min-w-0 items-center gap-3">
              {page.brandLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={page.brandLogo}
                  alt={`${page.brandName} logo`}
                  className={cn(
                    "size-11 rounded-lg border object-cover",
                    themeClasses.frame,
                  )}
                />
              ) : (
                <div
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold",
                    themeClasses.iconFrame,
                  )}
                  aria-hidden="true"
                >
                  {brandInitial}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{page.brandName}</p>
                <p className={cn("truncate text-xs", themeClasses.muted)}>
                  {shortUrl.replace(/^https?:\/\//, "")}
                </p>
              </div>
            </header>

            <div className="space-y-3">
              <h1 className="break-words text-2xl font-semibold leading-tight tracking-normal sm:text-3xl">
                {page.title}
              </h1>
              {page.description ? (
                <p className={cn("break-words text-sm leading-6", themeClasses.muted)}>
                  {page.description}
                </p>
              ) : null}
            </div>

            <style nonce={nonce} suppressHydrationWarning>
              {`.link-page-cta{background-color:${ctaColor};color:${ctaTextColor};}`}
            </style>
            <a
              href={ctaUrl}
              className="link-page-cta inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="min-w-0 truncate">{page.ctaText}</span>
              <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
            </a>

            {countdownTarget || page.showSocialProof !== false ? (
              <div className="grid gap-3">
                {countdownTarget ? (
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 text-sm",
                      themeClasses.frame,
                    )}
                  >
                    <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
                    <p className="min-w-0 break-words">
                      Offer ends in <CountdownTimer targetDate={countdownTarget} />
                    </p>
                  </div>
                ) : null}

                {page.showSocialProof !== false ? (
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 text-sm",
                      themeClasses.frame,
                    )}
                  >
                    <UsersRound className="size-4 shrink-0" aria-hidden="true" />
                    <p>{formatClickCount(clickCount)}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {qrCodeDataUrl ? (
              <div className={cn("rounded-lg border p-4", themeClasses.frame)}>
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className={cn("rounded-lg border p-2", themeClasses.qrFrame)}>
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

            <footer className={cn("flex items-center justify-center gap-2 text-xs", themeClasses.footer)}>
              <Link2 className="size-3.5" aria-hidden="true" />
              <span>Powered by LinkSnap</span>
            </footer>
          </div>
        </article>
      </section>
    </main>
  );
}
