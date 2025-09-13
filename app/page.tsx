import SetupGate from "@/components/SetupGate";
import { getSession } from "@/lib/get-session";
import { withDB } from "@/lib/with-db";
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
  // ---- Resilience: demo/auth/setup gates ----
  // If Prisma is unavailable at runtime, treat as demo mode
  const demoMode = true; // Simplified for build safety
  const sites = await withDB(
    () => Promise.resolve([]), // Mock empty sites since model doesn't exist
    [],
    'home.sites'
  );
  const hasAuth = Boolean((session as any)?.user);
  const hasSites = Array.isArray(sites) && sites.length > 0;

  if (demoMode || !hasAuth || !hasSites) {
    return <SetupGate hasAuth={hasAuth} hasSites={hasSites} demoMode={demoMode} />;
  }
  return null;
}
