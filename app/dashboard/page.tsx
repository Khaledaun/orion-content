export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withDB } from "@/lib/with-db";
import SetupGate from "@/components/SetupGate";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  // Get session without throwing errors
  const session = await getSession();

  // If not authenticated, show setup gate
  if (!session?.user) {
    return <SetupGate hasAuth={false} hasSites={false} demoMode={!prisma} />;
  }

  // Get dashboard data with fallbacks
  const siteCount = await withDB(
    () => prisma?.site.count() || Promise.resolve(0),
    0,
    "dashboard.siteCount",
  );

  const weekCount = await withDB(
    () =>
      prisma?.week.count({ where: { status: "pending" } }) ||
      Promise.resolve(0),
    0,
    "dashboard.weekCount",
  );

  const topicCount = await withDB(
    () => prisma?.topic.count() || Promise.resolve(0),
    0,
    "dashboard.topicCount",
  );

  const jobRunCount = await withDB(
    () => prisma?.jobRun.count() || Promise.resolve(0),
    0,
    "dashboard.jobRunCount",
  );

  // If no sites exist, show setup gate
  if (siteCount === 0) {
    return <SetupGate hasAuth={true} hasSites={false} />;
  }

  // Prepare dashboard data
  const dashboardData = {
    siteCount,
    weekCount,
    topicCount,
    jobRunCount,
  };

  // Extract user name from session
  const userName = session.user?.name || session.user?.email || "Admin";

  return <DashboardClient initialData={dashboardData} userName={userName} />;
}
