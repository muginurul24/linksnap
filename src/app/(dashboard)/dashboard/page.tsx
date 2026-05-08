import { redirect } from "next/navigation";
import { DashboardOverviewClient } from "@/app/(dashboard)/dashboard/dashboard-overview-client";
import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/auth/session-helpers";
import { getDashboardOverviewByUserId } from "@/lib/db/queries/dashboard";

export default async function DashboardOverview() {
  const session = await auth();
  const userId = getSessionUserId(session);

  if (!userId) redirect("/login?callbackUrl=/dashboard");

  const overview = await getDashboardOverviewByUserId({ userId });

  return <DashboardOverviewClient overview={overview} />;
}
