"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Globe2,
  Loader2,
  Route,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { buildShortUrlPreview } from "@/lib/links/preview";
import {
  createLinkSchema,
  linkSlugParamsSchema,
  type CreateLinkInput,
} from "@/lib/validations/link";

type CreateLinkField = keyof CreateLinkInput;
type FieldErrors = Partial<Record<CreateLinkField, string>>;
type SlugStatus =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "invalid"
  | "upgrade"
  | "error";

type ApiEnvelope<T> =
  | { data: T; success: true }
  | {
      error: {
        code: string;
        message?: string;
      };
      success: false;
    };

type CreateLinkResponse = {
  destinationUrl: string;
  id: string;
  shortUrl: string;
  slug: string;
};

type SlugAvailabilityResponse = {
  available: boolean;
  customSlugAllowed: boolean;
  slug: string;
};

type SlugState = {
  message?: string;
  status: SlugStatus;
};

const initialSlugState: SlugState = { status: "idle" };

function firstFieldErrors(
  errors: Partial<Record<CreateLinkField, string[] | undefined>>,
): FieldErrors {
  return Object.fromEntries(
    Object.entries(errors).map(([field, messages]) => [field, messages?.[0]]),
  ) as FieldErrors;
}

function getClientPreviewBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured;

  if (typeof window !== "undefined") return window.location.origin;

  return "https://linksnap.id";
}

function apiErrorMessage(code: string, fallback?: string): string {
  const messages: Record<string, string> = {
    LINK_QUOTA_EXCEEDED: "Link quota exceeded.",
    PLAN_UPGRADE_REQUIRED: "Custom slugs require an upgraded plan.",
    RATE_LIMITED: "Too many requests. Try again later.",
    SLUG_ALREADY_EXISTS: "This slug is already taken.",
    VALIDATION_ERROR: "Check the form and try again.",
  };

  return messages[code] ?? fallback ?? "Unable to create link.";
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function getSlugStatusClass(status: SlugStatus): string {
  if (status === "available") return "text-emerald-600 dark:text-emerald-400";
  if (status === "checking") return "text-muted-foreground";
  if (status === "idle") return "text-muted-foreground";
  return "text-destructive";
}

function SlugStatusMessage({ state }: { state: SlugState }) {
  if (state.status === "idle" || !state.message) return null;

  return (
    <div
      aria-live="polite"
      className={`flex min-h-4 items-center gap-1.5 text-xs ${getSlugStatusClass(
        state.status,
      )}`}
    >
      {state.status === "checking" && <Loader2 className="size-3 animate-spin" />}
      {state.status === "available" && <CheckCircle2 className="size-3" />}
      {state.status !== "checking" && state.status !== "available" && (
        <AlertCircle className="size-3" />
      )}
      <span>{state.message}</span>
    </div>
  );
}

export function CreateLinkForm() {
  const router = useRouter();
  const [destinationUrl, setDestinationUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [enableLinkPage, setEnableLinkPage] = useState(false);
  const [enableSmartRules, setEnableSmartRules] = useState(false);
  const [linkPageBrandName, setLinkPageBrandName] = useState("");
  const [linkPageTitle, setLinkPageTitle] = useState("");
  const [linkPageDescription, setLinkPageDescription] = useState("");
  const [linkPageCtaText, setLinkPageCtaText] = useState("Continue");
  const [linkPageCtaColor, setLinkPageCtaColor] = useState("#111827");
  const [smartRuleType, setSmartRuleType] = useState("device");
  const [smartRuleValue, setSmartRuleValue] = useState("");
  const [smartRuleDestination, setSmartRuleDestination] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugState, setSlugState] = useState<SlugState>(initialSlugState);

  const previewUrl = useMemo(
    () => buildShortUrlPreview(getClientPreviewBaseUrl(), slug),
    [slug],
  );
  const safeCtaColor = /^#[0-9a-fA-F]{6}$/.test(linkPageCtaColor)
    ? linkPageCtaColor
    : "#111827";

  useEffect(() => {
    const trimmedSlug = slug.trim();
    if (!trimmedSlug) return;

    const parsed = linkSlugParamsSchema.safeParse({ slug: trimmedSlug });
    if (!parsed.success) return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setSlugState({ message: "Checking slug availability.", status: "checking" });

      void fetch(`/api/v1/links/slug/${encodeURIComponent(trimmedSlug)}`, {
        credentials: "same-origin",
        headers: { "X-Requested-With": "XMLHttpRequest" },
        signal: controller.signal,
      })
        .then(async (response) => {
          const body = (await response.json()) as ApiEnvelope<SlugAvailabilityResponse>;
          if (!body.success) {
            throw new Error(apiErrorMessage(body.error.code, body.error.message));
          }
          return body.data;
        })
        .then((data) => {
          if (controller.signal.aborted) return;

          if (!data.available) {
            setSlugState({ message: "This slug is already taken.", status: "taken" });
            return;
          }

          if (!data.customSlugAllowed) {
            setSlugState({
              message: "Custom slugs require an upgraded plan.",
              status: "upgrade",
            });
            return;
          }

          setSlugState({ message: "Slug available.", status: "available" });
        })
        .catch((error: unknown) => {
          if (isAbortError(error) || controller.signal.aborted) return;

          const message =
            error instanceof Error
              ? error.message
              : "Unable to check slug availability.";
          setSlugState({ message, status: "error" });
        });
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [slug]);

  const updateSlug = (value: string) => {
    setSlug(value);
    setFieldErrors((current) => ({ ...current, slug: undefined }));
    setFormError(null);

    const trimmedSlug = value.trim();
    if (!trimmedSlug) {
      setSlugState(initialSlugState);
      return;
    }

    const parsed = linkSlugParamsSchema.safeParse({ slug: trimmedSlug });
    if (!parsed.success) {
      const message =
        parsed.error.flatten().fieldErrors.slug?.[0] ??
        "Slug must be 3-50 lowercase letters, numbers, or hyphens.";
      setSlugState({ message, status: "invalid" });
      return;
    }

    setSlugState({ message: "Checking slug availability.", status: "checking" });
  };

  const assertSlugCanSubmit = (): boolean => {
    if (!slug.trim()) return true;

    const blockingMessages: Partial<Record<SlugStatus, string>> = {
      checking: "Wait for slug availability check to finish.",
      invalid: slugState.message,
      taken: "This slug is already taken.",
      upgrade: "Custom slugs require an upgraded plan.",
    };
    const message = blockingMessages[slugState.status];

    if (!message) return true;

    setFieldErrors((current) => ({ ...current, slug: message }));
    return false;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = createLinkSchema.safeParse({
      destinationUrl,
      slug,
      title,
    });

    if (!parsed.success) {
      setFieldErrors(firstFieldErrors(parsed.error.flatten().fieldErrors));
      return;
    }

    if (!assertSlugCanSubmit()) return;

    setIsSubmitting(true);
    setFieldErrors({});
    setFormError(null);

    try {
      const response = await fetch("/api/v1/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify(parsed.data),
      });
      const body = (await response.json()) as ApiEnvelope<CreateLinkResponse>;

      if (!body.success) {
        const message = apiErrorMessage(body.error.code, body.error.message);
        if (body.error.code === "SLUG_ALREADY_EXISTS") {
          setFieldErrors((current) => ({ ...current, slug: message }));
          setSlugState({ message, status: "taken" });
        } else if (body.error.code === "PLAN_UPGRADE_REQUIRED") {
          setFieldErrors((current) => ({ ...current, slug: message }));
          setSlugState({ message, status: "upgrade" });
        } else {
          setFormError(message);
        }
        return;
      }

      toast.success("Link created.", { description: body.data.shortUrl });
      router.push("/links");
      router.refresh();
    } catch {
      setFormError("Unable to reach the link service.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]" onSubmit={handleSubmit} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Link details</CardTitle>
          <CardDescription>Destination, slug, and optional title.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="destinationUrl">Destination URL</Label>
            <Input
              id="destinationUrl"
              type="url"
              inputMode="url"
              placeholder="https://example.com/product"
              value={destinationUrl}
              onChange={(event) => {
                setDestinationUrl(event.target.value);
                setFieldErrors((current) => ({
                  ...current,
                  destinationUrl: undefined,
                }));
                setFormError(null);
              }}
              aria-invalid={Boolean(fieldErrors.destinationUrl)}
              disabled={isSubmitting}
            />
            {fieldErrors.destinationUrl && (
              <p className="text-xs text-destructive">{fieldErrors.destinationUrl}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-1.5">
              <Label htmlFor="slug">Custom slug</Label>
              <Input
                id="slug"
                inputMode="url"
                placeholder="promo-2026"
                value={slug}
                onChange={(event) => updateSlug(event.target.value)}
                aria-invalid={Boolean(fieldErrors.slug)}
                disabled={isSubmitting}
              />
              <SlugStatusMessage state={slugState} />
              {fieldErrors.slug && (
                <p className="text-xs text-destructive">{fieldErrors.slug}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Campaign link"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setFieldErrors((current) => ({ ...current, title: undefined }));
                  setFormError(null);
                }}
                aria-invalid={Boolean(fieldErrors.title)}
                disabled={isSubmitting}
              />
              {fieldErrors.title && (
                <p className="text-xs text-destructive">{fieldErrors.title}</p>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Globe2 className="size-4 text-muted-foreground" />
                <Label htmlFor="enableLinkPage">Enable Link Page</Label>
              </div>
              <Switch
                id="enableLinkPage"
                checked={enableLinkPage}
                onCheckedChange={setEnableLinkPage}
                disabled={isSubmitting}
              />
            </div>

            {enableLinkPage && (
              <div className="grid gap-3 pt-1 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="linkPageBrandName">Brand name</Label>
                  <Input
                    id="linkPageBrandName"
                    value={linkPageBrandName}
                    onChange={(event) => setLinkPageBrandName(event.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="linkPageTitle">Page title</Label>
                  <Input
                    id="linkPageTitle"
                    value={linkPageTitle}
                    onChange={(event) => setLinkPageTitle(event.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="linkPageDescription">Description</Label>
                  <textarea
                    id="linkPageDescription"
                    className="min-h-20 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 dark:bg-input/30"
                    value={linkPageDescription}
                    onChange={(event) => setLinkPageDescription(event.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="linkPageCtaText">CTA text</Label>
                  <Input
                    id="linkPageCtaText"
                    value={linkPageCtaText}
                    onChange={(event) => setLinkPageCtaText(event.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="linkPageCtaColor">CTA color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="linkPageCtaColor"
                      type="color"
                      className="w-12 p-1"
                      value={linkPageCtaColor}
                      onChange={(event) => setLinkPageCtaColor(event.target.value)}
                      disabled={isSubmitting}
                    />
                    <Input
                      value={linkPageCtaColor}
                      onChange={(event) => setLinkPageCtaColor(event.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Route className="size-4 text-muted-foreground" />
                <Label htmlFor="enableSmartRules">Enable Smart Rules</Label>
              </div>
              <Switch
                id="enableSmartRules"
                checked={enableSmartRules}
                onCheckedChange={setEnableSmartRules}
                disabled={isSubmitting}
              />
            </div>

            {enableSmartRules && (
              <div className="grid gap-3 pt-1 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="smartRuleType">Rule type</Label>
                  <select
                    id="smartRuleType"
                    className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                    value={smartRuleType}
                    onChange={(event) => setSmartRuleType(event.target.value)}
                    disabled={isSubmitting}
                  >
                    <option value="device">Device</option>
                    <option value="country">Country</option>
                    <option value="referrer">Referrer</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="smartRuleValue">Match value</Label>
                  <Input
                    id="smartRuleValue"
                    placeholder="mobile"
                    value={smartRuleValue}
                    onChange={(event) => setSmartRuleValue(event.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="smartRuleDestination">Destination URL</Label>
                  <Input
                    id="smartRuleDestination"
                    type="url"
                    inputMode="url"
                    placeholder="https://example.com/mobile"
                    value={smartRuleDestination}
                    onChange={(event) => setSmartRuleDestination(event.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}
          </div>

          {formError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Create link
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:sticky lg:top-4 lg:self-start">
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>Current draft.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="break-all font-mono text-sm font-medium">{previewUrl}</p>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Destination</span>
              <span className="max-w-44 truncate font-medium">
                {destinationUrl || "Not set"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Link Page</span>
              <span className="font-medium">{enableLinkPage ? "Enabled" : "Off"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Smart Rules</span>
              <span className="font-medium">
                {enableSmartRules ? "Enabled" : "Off"}
              </span>
            </div>
          </div>

          {enableLinkPage && (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Globe2 className="size-4 text-muted-foreground" />
                {linkPageBrandName || "Brand name"}
              </div>
              <p className="text-sm font-medium">{linkPageTitle || "Page title"}</p>
              <p className="line-clamp-3 text-sm text-muted-foreground">
                {linkPageDescription || "Description"}
              </p>
              <div
                className="inline-flex h-8 items-center rounded-lg px-3 text-sm font-medium text-white"
                style={{ backgroundColor: safeCtaColor }}
              >
                {linkPageCtaText || "Continue"}
              </div>
            </div>
          )}

          {enableSmartRules && (
            <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <Route className="size-4 text-muted-foreground" />
                {smartRuleType}
              </div>
              <div className="text-muted-foreground">
                {smartRuleValue || "match"} to{" "}
                <span className="break-all">
                  {smartRuleDestination || "destination"}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </form>
  );
}
