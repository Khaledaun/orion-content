import SetupGate from "@/components/SetupGate";
import { getSession } from "@/lib/get-session";
import { withDB } from "@/lib/with-db";
import prisma from "@/lib/prisma";
export const runtime = 'nodejs';
export const dynamic = "force-dynamic";

import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  await requireAuth()
  redirect('/dashboard')
}

/* ---- Resilience: demo/auth/setup gates ---- */
async function pageSafeBlock() {
  const session = await getSession();
  // If Prisma is unavailable at runtime, treat as demo mode
  const demoMode = !prisma || !("site" in prisma);
  const sites = await withDB(
    () => prisma?.site.findMany({ take: 5 }) ?? Promise.resolve([]),
    [],
    "'"$label"'.sites"
  );
  const hasAuth = !!session?.user;
  const hasSites = Array.isArray(sites) && sites.length > 0;

  if (demoMode || !hasAuth || !hasSites) {
    return <SetupGate hasAuth={hasAuth} hasSites={hasSites} demoMode={demoMode} />;
  }
  return null;
}
