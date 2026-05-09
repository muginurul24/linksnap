import { notFound, redirect } from "next/navigation";
import { BackNavigationLink } from "@/components/dashboard/back-navigation-link";
import { DashboardBreadcrumbs } from "@/components/dashboard/dashboard-breadcrumbs";
import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/auth/session-helpers";
import {
  countLinkPagesByUserId,
  findEditableLinkBySlugForUser,
} from "@/lib/db/queries/links";
import { linkSlugParamsSchema } from "@/lib/validations/link";
import {
  CreateLinkForm,
  type EditableLinkInitialData,
} from "@/app/(dashboard)/links/link-form";

type EditLinkPageProps = {
  params: Promise<{ slug: string }>;
};

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

  const [link, linkPageCount] = await Promise.all([
    findEditableLinkBySlugForUser(parsedParams.data.slug, userId),
    countLinkPagesByUserId(userId),
  ]);
  const initialLink = toInitialLink(link);

  return (
    <>
      <div className="space-y-3">
        <DashboardBreadcrumbs
          items={[
            { href: "/dashboard", label: "Dashboard" },
            { href: "/links", label: "My Links" },
            { label: `/${initialLink.slug}` },
          ]}
        />
        <BackNavigationLink href="/links">Back to Links</BackNavigationLink>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Link</h1>
          <p className="text-sm text-muted-foreground">
            Update destination, slug, and routing settings.
          </p>
        </div>
      </div>

      <CreateLinkForm
        initialLink={initialLink}
        linkPageCount={linkPageCount}
      />
    </>
  );
}
