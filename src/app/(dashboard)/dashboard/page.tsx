import { redirect } from "next/navigation";
import { DashboardOverviewClient } from "@/app/(dashboard)/dashboard/dashboard-overview-client";
import { auth } from "@/lib/auth";
import { getDashboardOverviewByUserId } from "@/lib/db/queries/dashboard";

type SessionWithUserId = {
  user?: {
    id?: unknown;
  } | null;
} | null;

function getSessionUserId(session: SessionWithUserId): string | null {
  return typeof session?.user?.id === "string" ? session.user.id : null;
}

export default async function DashboardOverview() {
  const session = await auth();
  const userId = getSessionUserId(session);

  if (!userId) redirect("/login?callbackUrl=/dashboard");

  const overview = await getDashboardOverviewByUserId({ userId });

  return <DashboardOverviewClient overview={overview} />;
}
