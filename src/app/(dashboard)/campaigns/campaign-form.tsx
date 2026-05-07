"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
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
import {
  createCampaignSchema,
  updateCampaignSchema,
  type CreateCampaignInput,
  type UpdateCampaignInput,
} from "@/lib/validations/campaign";

type CampaignFormField = keyof CreateCampaignInput;
type FieldErrors = Partial<Record<CampaignFormField, string>>;

type ApiEnvelope<T> =
  | { data: T; success: true }
  | {
      error: {
        code: string;
        details?: unknown;
        message?: string;
      };
      success: false;
    };

type CampaignMutationResponse = {
  id: string;
  name: string;
  slug: string;
};

export type EditableCampaignInitialData = {
  description: string | null;
  id: string;
  name: string;
  slug: string;
  utmCampaign: string | null;
  utmContent: string | null;
  utmMedium: string | null;
  utmSource: string | null;
  utmTerm: string | null;
};

type CampaignFormProps = {
  initialCampaign?: EditableCampaignInitialData;
};

function firstFieldErrors(
  errors: Partial<Record<CampaignFormField, string[] | undefined>>,
): FieldErrors {
  return Object.fromEntries(
    Object.entries(errors).map(([field, messages]) => [field, messages?.[0]]),
  ) as FieldErrors;
}

function valueOrEmpty(value: string | null | undefined): string {
  return value ?? "";
}

function getRetryAfter(details: unknown): number | null {
  if (typeof details !== "object" || details === null) return null;

  const retryAfter = (details as Record<string, unknown>).retryAfter;
  return typeof retryAfter === "number" && Number.isFinite(retryAfter)
    ? Math.ceil(retryAfter)
    : null;
}

function apiErrorMessage(
  code: string,
  fallback?: string,
  details?: unknown,
): string {
  const retryAfter = getRetryAfter(details);
  if (code === "RATE_LIMITED" && retryAfter !== null) {
    return `Too many requests. Try again in ${retryAfter} seconds.`;
  }

  const messages: Record<string, string> = {
    CAMPAIGN_QUOTA_EXCEEDED: "Campaign quota exceeded.",
    CAMPAIGN_SLUG_ALREADY_EXISTS: "This campaign slug is already taken.",
    RATE_LIMITED: "Too many requests. Try again later.",
    VALIDATION_ERROR: "Check the form and try again.",
  };

  return messages[code] ?? fallback ?? "Unable to save campaign.";
}

export function getCampaignSubmitSuccessFeedback({
  isEditMode,
  name,
}: {
  isEditMode: boolean;
  name: string;
}): { description: string; message: string; redirectTo: "/campaigns" } {
  return {
    description: name,
    message: isEditMode ? "Campaign updated" : "Campaign created",
    redirectTo: "/campaigns",
  };
}

export function CampaignForm({ initialCampaign }: CampaignFormProps) {
  const router = useRouter();
  const isEditMode = initialCampaign !== undefined;
  const [description, setDescription] = useState(
    valueOrEmpty(initialCampaign?.description),
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(initialCampaign?.name ?? "");
  const [slug, setSlug] = useState(initialCampaign?.slug ?? "");
  const [utmCampaign, setUtmCampaign] = useState(
    valueOrEmpty(initialCampaign?.utmCampaign),
  );
  const [utmContent, setUtmContent] = useState(
    valueOrEmpty(initialCampaign?.utmContent),
  );
  const [utmMedium, setUtmMedium] = useState(
    valueOrEmpty(initialCampaign?.utmMedium),
  );
  const [utmSource, setUtmSource] = useState(
    valueOrEmpty(initialCampaign?.utmSource),
  );
  const [utmTerm, setUtmTerm] = useState(valueOrEmpty(initialCampaign?.utmTerm));

  const clearFieldError = (field: CampaignFormField) => {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const rawInput = {
      description,
      name,
      slug,
      utmCampaign,
      utmContent,
      utmMedium,
      utmSource,
      utmTerm,
    };
    const parsed = isEditMode
      ? updateCampaignSchema.safeParse(rawInput)
      : createCampaignSchema.safeParse(rawInput);

    if (!parsed.success) {
      setFieldErrors(firstFieldErrors(parsed.error.flatten().fieldErrors));
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(
        isEditMode
          ? `/api/v1/campaigns/${initialCampaign.id}`
          : "/api/v1/campaigns",
        {
          body: JSON.stringify(
            parsed.data as CreateCampaignInput | UpdateCampaignInput,
          ),
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          method: isEditMode ? "PATCH" : "POST",
        },
      );
      const body = (await response.json()) as ApiEnvelope<CampaignMutationResponse>;

      if (!body.success) {
        const message = apiErrorMessage(
          body.error.code,
          body.error.message,
          body.error.details,
        );

        if (body.error.code === "CAMPAIGN_SLUG_ALREADY_EXISTS") {
          setFieldErrors((current) => ({ ...current, slug: message }));
        } else {
          setFormError(message);
        }
        return;
      }

      const feedback = getCampaignSubmitSuccessFeedback({
        isEditMode,
        name: body.data.name,
      });
      toast.success(feedback.message, { description: feedback.description });
      router.push(feedback.redirectTo);
      router.refresh();
    } catch {
      setFormError("Unable to reach the campaign service.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]"
      onSubmit={handleSubmit}
    >
      <Card>
        <CardHeader>
          <CardTitle>{isEditMode ? "Edit Campaign" : "New Campaign"}</CardTitle>
          <CardDescription>
            {isEditMode
              ? "Update campaign metadata and UTM defaults."
              : "Create a campaign with reusable UTM defaults."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="campaignName">Name</Label>
              <Input
                aria-invalid={Boolean(fieldErrors.name)}
                disabled={isSubmitting}
                id="campaignName"
                onChange={(event) => {
                  setName(event.target.value);
                  clearFieldError("name");
                }}
                placeholder="Ramadhan Sale"
                value={name}
              />
              {fieldErrors.name ? (
                <p className="text-xs text-destructive">{fieldErrors.name}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="campaignSlug">Slug</Label>
              <Input
                aria-invalid={Boolean(fieldErrors.slug)}
                disabled={isSubmitting}
                id="campaignSlug"
                inputMode="url"
                onChange={(event) => {
                  setSlug(event.target.value);
                  clearFieldError("slug");
                }}
                placeholder="ramadhan-sale"
                value={slug}
              />
              {fieldErrors.slug ? (
                <p className="text-xs text-destructive">{fieldErrors.slug}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="campaignDescription">Description</Label>
            <textarea
              className="min-h-24 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 dark:bg-input/30"
              disabled={isSubmitting}
              id="campaignDescription"
              onChange={(event) => {
                setDescription(event.target.value);
                clearFieldError("description");
              }}
              placeholder="Campaign notes"
              value={description}
            />
            {fieldErrors.description ? (
              <p className="text-xs text-destructive">{fieldErrors.description}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="utmSource">UTM source</Label>
              <Input
                disabled={isSubmitting}
                id="utmSource"
                onChange={(event) => {
                  setUtmSource(event.target.value);
                  clearFieldError("utmSource");
                }}
                placeholder="instagram"
                value={utmSource}
              />
              {fieldErrors.utmSource ? (
                <p className="text-xs text-destructive">{fieldErrors.utmSource}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="utmMedium">UTM medium</Label>
              <Input
                disabled={isSubmitting}
                id="utmMedium"
                onChange={(event) => {
                  setUtmMedium(event.target.value);
                  clearFieldError("utmMedium");
                }}
                placeholder="social"
                value={utmMedium}
              />
              {fieldErrors.utmMedium ? (
                <p className="text-xs text-destructive">{fieldErrors.utmMedium}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="utmCampaign">UTM campaign</Label>
              <Input
                disabled={isSubmitting}
                id="utmCampaign"
                onChange={(event) => {
                  setUtmCampaign(event.target.value);
                  clearFieldError("utmCampaign");
                }}
                placeholder="ramadhan-2026"
                value={utmCampaign}
              />
              {fieldErrors.utmCampaign ? (
                <p className="text-xs text-destructive">
                  {fieldErrors.utmCampaign}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="utmTerm">UTM term</Label>
              <Input
                disabled={isSubmitting}
                id="utmTerm"
                onChange={(event) => {
                  setUtmTerm(event.target.value);
                  clearFieldError("utmTerm");
                }}
                placeholder="keyword"
                value={utmTerm}
              />
              {fieldErrors.utmTerm ? (
                <p className="text-xs text-destructive">{fieldErrors.utmTerm}</p>
              ) : null}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="utmContent">UTM content</Label>
              <Input
                disabled={isSubmitting}
                id="utmContent"
                onChange={(event) => {
                  setUtmContent(event.target.value);
                  clearFieldError("utmContent");
                }}
                placeholder="hero-button"
                value={utmContent}
              />
              {fieldErrors.utmContent ? (
                <p className="text-xs text-destructive">{fieldErrors.utmContent}</p>
              ) : null}
            </div>
          </div>

          {formError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button aria-busy={isSubmitting} disabled={isSubmitting} type="submit">
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {isEditMode ? "Save changes" : "Create campaign"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:sticky lg:top-4 lg:self-start">
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>Campaign defaults.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Slug</p>
            <p className="font-mono font-medium">/{slug || "campaign-slug"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Name</p>
            <p className="font-medium">{name || "Campaign name"}</p>
          </div>
          <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">source</span>
              <span className="font-mono">{utmSource || "not set"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">medium</span>
              <span className="font-mono">{utmMedium || "not set"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">campaign</span>
              <span className="font-mono">{utmCampaign || "not set"}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
