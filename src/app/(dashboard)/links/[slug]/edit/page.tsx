import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { auth } from "@/lib/auth";
import { findEditableLinkBySlugForUser } from "@/lib/db/queries/links";
import { findBillingUserById } from "@/lib/db/queries/payments";
import { linkSlugParamsSchema } from "@/lib/validations/link";
import {
  CreateLinkForm,
  type EditableLinkInitialData,
} from "../../link-form";

type EditLinkPageProps = {
  params: Promise<{ slug: string }>;
};

type SessionWithUserId = {
  user?: {
    id?: unknown;
  } | null;
} | null;

function getSessionUserId(session: SessionWithUserId): string | null {
  return typeof session?.user?.id === "string" ? session.user.id : null;
}

function toInitialLink(link: Awaited<ReturnType<typeof findEditableLinkBySlugForUser>>): EditableLinkInitialData {
  if (!link) notFound();

  return {
    destinationUrl: link.destinationUrl,
    hasLinkPage: link.hasLinkPage,
    id: link.id,
    linkPage: link.linkPage,
    slug: link.slug,
    smartRules: link.smartRules,
    title: link.title,
  };
}

export default async function EditLinkPage({ params }: EditLinkPageProps) {
  const parsedParams = linkSlugParamsSchema.safeParse(await params);
  if (!parsedParams.success) notFound();

  const session = await auth();
  const userId = getSessionUserId(session);
  if (!userId) {
    redirect(`/login?callbackUrl=/links/${parsedParams.data.slug}/edit`);
  }

  const [link, billingUser] = await Promise.all([
    findEditableLinkBySlugForUser(parsedParams.data.slug, userId),
    findBillingUserById(userId),
  ]);
  const initialLink = toInitialLink(link);
  const userPlan = billingUser?.plan ?? "FREE";

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Link</h1>
          <p className="text-sm text-muted-foreground">
            Update destination, slug, and routing settings.
          </p>
        </div>
        <ButtonLink href="/links" size="sm" variant="outline">
          <ArrowLeft className="size-4" />
          Back
        </ButtonLink>
      </div>

      <CreateLinkForm initialLink={initialLink} userPlan={userPlan} />
    </>
  );
}
