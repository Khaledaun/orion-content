export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { getSession } from '@/lib/auth';
import { safeDbOperation } from '@/lib/safe-prisma';
import { redirect } from 'next/navigation';
import SetupGate from '@/components/SetupGate';

export default async function HomePage() {
  // Get session without throwing errors
  const session = await getSession();
  
  // If user is authenticated, check if they have sites and redirect to dashboard
  if (session?.user) {
    const sites = await safeDbOperation(
      'site.findMany',
      [],
      { take: 1 }
    );
    
    // If user has sites, redirect to dashboard
    if (sites.length > 0) {
      redirect('/dashboard');
    }
    
    // User is authenticated but has no sites, show setup gate
    return <SetupGate hasAuth={true} hasSites={false} />;
  }

  // Check if we're in demo mode (during build or when database is unavailable)
  const demoMode = process.env.SKIP_PRISMA_GENERATE === 'true' || process.env.CI === 'true';
  
  // User is not authenticated, show appropriate setup gate
  return <SetupGate hasAuth={false} hasSites={false} demoMode={demoMode} />;
}
