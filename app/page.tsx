export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withDB } from '@/lib/with-db';
import { redirect } from 'next/navigation';
import SetupGate from '@/components/SetupGate';

export default async function HomePage() {
  // Get session without throwing errors
  const session = await getSession();
  
  // If user is authenticated, check if they have sites and redirect to dashboard
  if (session?.user) {
    const sites = await withDB(
      () => prisma?.site.findMany({ take: 1 }) || Promise.resolve([]),
      [],
      'home.sites'
    );
    
    // If user has sites, redirect to dashboard
    if (sites.length > 0) {
      redirect('/dashboard');
    }
    
    // User is authenticated but has no sites, show setup gate
    return <SetupGate hasAuth={true} hasSites={false} />;
  }

  // Check if we're in demo mode (when Prisma is unavailable)
  const demoMode = !prisma;
  
  // User is not authenticated, show appropriate setup gate
  return <SetupGate hasAuth={false} hasSites={false} demoMode={demoMode} />;
}
