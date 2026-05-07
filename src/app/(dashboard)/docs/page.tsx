import { redirect } from "next/navigation";
import { BookOpen, KeyRound } from "lucide-react";
import { auth } from "@/lib/auth";
import { getApiDocsPageRedirect } from "@/lib/api-docs/access";
import { API_DOC_SECTIONS, type ApiEndpointDoc } from "@/lib/api-docs/spec";
import { findBillingUserById } from "@/lib/db/queries/payments";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopySnippetButton } from "@/app/(dashboard)/docs/copy-snippet-button";

type SessionWithUserId = {
  user?: {
    id?: unknown;
  } | null;
} | null;

function getSessionUserId(session: SessionWithUserId): string | null {
  return typeof session?.user?.id === "string" ? session.user.id : null;
}

function EndpointCard({ endpoint }: { endpoint: ApiEndpointDoc }) {
  const requestJson = endpoint.requestExample
    ? JSON.stringify(endpoint.requestExample, null, 2)
    : null;
  const responseJson = JSON.stringify(endpoint.responseExample, null, 2);

  return (
    <div className="rounded-md border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{endpoint.method}</Badge>
            <code className="break-all rounded bg-muted px-2 py-1 font-mono text-xs">
              {endpoint.path}
            </code>
          </div>
          <p className="mt-3 text-sm font-medium">{endpoint.summary}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Auth: {endpoint.auth} · Rate limit: {endpoint.rateLimit}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {requestJson ? (
          <div className="rounded-md border bg-muted/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Request
              </p>
              <CopySnippetButton value={requestJson} />
            </div>
            <pre className="overflow-x-auto text-xs leading-5">{requestJson}</pre>
          </div>
        ) : null}
        <div className="rounded-md border bg-muted/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Response
            </p>
            <CopySnippetButton value={responseJson} />
          </div>
          <pre className="overflow-x-auto text-xs leading-5">{responseJson}</pre>
        </div>
      </div>
    </div>
  );
}

export default async function ApiDocsPage() {
  const session = await auth();
  const userId = getSessionUserId(session);
  const billingUser = userId ? await findBillingUserById(userId) : null;
  const redirectTarget = getApiDocsPageRedirect({
    plan: billingUser?.plan,
    userId,
  });

  if (redirectTarget) redirect(redirectTarget);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Docs</h1>
          <p className="text-sm text-muted-foreground">
            Reference for LinkSnap endpoints, auth requirements, rate limits,
            and request/response shapes.
          </p>
        </div>
        <ButtonLink href="/api/v1/docs" size="sm" variant="outline">
          <BookOpen className="size-4" />
          OpenAPI JSON
        </ButtonLink>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4" />
            Authentication
          </CardTitle>
          <CardDescription>
            Send API keys with a bearer token header. Real API key creation and
            revocation are tracked in Task 12.13.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 p-3">
            <code className="break-all font-mono text-xs">
              Authorization: Bearer lsnap_sk_...
            </code>
            <CopySnippetButton value="Authorization: Bearer lsnap_sk_..." />
          </div>
          <ButtonLink
            className="mt-4"
            href="/settings?tab=api"
            size="sm"
            variant="outline"
          >
            Manage API keys
          </ButtonLink>
        </CardContent>
      </Card>

      <div className="space-y-8">
        {API_DOC_SECTIONS.map((section) => (
          <section key={section.title} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <p className="text-sm text-muted-foreground">
                {section.description}
              </p>
            </div>
            <div className="space-y-3">
              {section.endpoints.map((endpoint) => (
                <EndpointCard
                  endpoint={endpoint}
                  key={`${endpoint.method}:${endpoint.path}`}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
