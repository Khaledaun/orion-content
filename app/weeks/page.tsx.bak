export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withDB } from '@/lib/with-db'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import ApproveButton from './approve-button'
import { ArrowLeft, Calendar, CheckCircle, Clock } from 'lucide-react'
import SetupGate from '@/components/SetupGate'

type Week = {
  id: string;
  isoWeek: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    topics: number;
  };
};

export default async function WeeksPage() {
  // Get session without throwing errors
  const session = await getSession();
  
  // If not authenticated, show setup gate
  if (!session?.user) {
    return <SetupGate hasAuth={false} hasSites={false} demoMode={!prisma} />;
  }

  // Get weeks with error handling
  const weeks = await withDB(
    () => prisma?.week.findMany({
      orderBy: { isoWeek: 'desc' },
      include: {
        _count: {
          select: { topics: true }
        }
      }
    }) || Promise.resolve([]),
    [] as Week[],
    'weeks.findMany'
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
              <h1 className="ml-4 text-2xl font-bold text-gray-900">Weeks</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {weeks.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No weeks</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Weeks will appear here when content is generated.
                </p>
              </div>
            ) : (
              weeks.map((week: Week) => (
                <Card key={week.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        <Calendar className="mr-2 h-5 w-5" />
                        Week {week.isoWeek}
                      </span>
                      <Badge 
                        variant={week.status === 'APPROVED' ? 'default' : 'secondary'}
                        className={week.status === 'APPROVED' ? 'bg-green-500' : ''}
                      >
                        {week.status === 'APPROVED' ? (
                          <>
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Approved
                          </>
                        ) : (
                          <>
                            <Clock className="mr-1 h-3 w-3" />
                            Pending
                          </>
                        )}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {week._count.topics} topics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm text-gray-500">
                        Created: {new Date(week.createdAt).toLocaleDateString()}
                      </div>
                      {week.status === 'PENDING' && (
                        <ApproveButton weekId={week.id} />
                      )}
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
