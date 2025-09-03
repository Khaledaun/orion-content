export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { getSession } from '@/lib/auth'
import { prisma } from '@/app/lib/prisma'
import { withDB } from '@/lib/with-db'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import CreateSiteForm from './create-site-form'
import { ArrowLeft, Globe } from 'lucide-react'
import SetupGate from '@/components/SetupGate'

type Site = {
  id: string;
  name: string;
  key: string;
  timezone: string;
  publisher?: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    categories: number;
    topics: number;
  };
};

export default async function SitesPage() {
  // Get session without throwing errors
  const session = await getSession();
  
  // If not authenticated, show setup gate
  if (!session?.user) {
    return <SetupGate hasAuth={false} hasSites={false} demoMode={!prisma} />;
  }

  // Get sites with error handling
  const sites = await withDB(
    () => prisma?.site.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { categories: true, topics: true }
        }
      }
    }) || Promise.resolve([]),
    [] as Site[],
    'sites.findMany'
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
              <h1 className="ml-4 text-2xl font-bold text-gray-900">Sites</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Create New Site</CardTitle>
                <CardDescription>
                  Add a new content site to your network
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CreateSiteForm />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sites.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Globe className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No sites</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first site.
                </p>
              </div>
            ) : (
              sites.map((site: Site) => (
                <Card key={site.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Globe className="mr-2 h-5 w-5" />
                      {site.name}
                    </CardTitle>
                    <CardDescription>
                      Key: {site.key}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-gray-500">Timezone:</span> {site.timezone}
                      </div>
                      {site.publisher && (
                        <div className="text-sm">
                          <span className="text-gray-500">Publisher:</span> {site.publisher}
                        </div>
                      )}
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>{site._count.categories} categories</span>
                        <span>{site._count.topics} topics</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
