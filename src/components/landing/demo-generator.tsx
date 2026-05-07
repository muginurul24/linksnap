"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Copy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DemoGenerator() {
  const [url, setUrl] = useState("https://myshop.id/ramadhan-sale?utm_source=instagram");
  const [shortLink, setShortLink] = useState("https://linksnap.id/myshop-k7p3");
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const destinationHost = useMemo(() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "destination";
    }
  }, [url]);

  function submitDemo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateDemoUrl(url);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setShortLink(`https://linksnap.id/${generateDemoSlug(url)}`);
  }

  async function copyShortLink() {
    await navigator.clipboard.writeText(shortLink);
    setIsCopied(true);
    window.setTimeout(() => setIsCopied(false), 2000);
  }

  return (
    <section id="demo" className="border-y bg-muted/40 py-20 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="text-sm font-semibold uppercase text-emerald-400">
              Demo Generator
            </p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
              Generate a short link preview before signing up
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Paste a public URL and LinkSnap creates a live browser-side short
              link preview with the same slug style used in the dashboard.
            </p>
          </div>

          <div className="rounded-md border bg-background p-5 shadow-sm sm:p-6">
            <form className="space-y-4" onSubmit={submitDemo}>
              <label className="block text-sm font-medium" htmlFor="demo-url">
                Destination URL
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  id="demo-url"
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://example.com/campaign"
                  className="h-11"
                  aria-invalid={Boolean(error)}
                />
                <Button type="submit" className="h-11 px-4">
                  Generate
                  <Zap className="size-4" />
                </Button>
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </form>

            <div className="mt-6 rounded-md border bg-muted/50 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Short link
                  </p>
                  <p className="mt-1 break-all font-[ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation_Mono','Courier_New',monospace] text-base text-foreground">
                    {shortLink}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9"
                  onClick={copyShortLink}
                >
                  <Copy className="size-4" />
                  {isCopied ? "Copied" : "Copy"}
                </Button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  ["Destination", destinationHost],
                  ["Rule", "HTTP 308"],
                  ["Status", "Preview"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border bg-background p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 truncate text-sm font-medium">{value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Preview only. Create an account to publish real redirects, QR
                codes, analytics, and Link Pages.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function validateDemoUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();

    if (!["https:", "http:"].includes(parsed.protocol)) {
      return "Use an http or https URL.";
    }

    if (isInternalHostname(hostname)) {
      return "Use a public destination URL.";
    }

    return null;
  } catch {
    return "Enter a valid public URL.";
  }
}

function isInternalHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.endsWith(".local") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    hostname.match(/^172\.(1[6-9]|2\d|3[0-1])\./) !== null
  );
}

function generateDemoSlug(value: string): string {
  const hostname = new URL(value).hostname
    .replace(/^www\./, "")
    .split(".")[0]
    .replace(/[^a-z0-9-]/gi, "")
    .toLowerCase()
    .slice(0, 10);
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes)
    .map((byte) => byte.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 5);

  return `${hostname || "snap"}-${suffix}`;
}
