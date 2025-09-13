export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";

export const GET = withAuth(async () => {
  const mockCurrentWeek = {
    id: 'current-week-1',
    status: 'ACTIVE',
    startDate: new Date().toISOString(),
    note: 'Placeholder - requires week model implementation'
  }
  return NextResponse.json({ week: mockCurrentWeek })
}, ({ roles: ["admin", "user"], allowBearer: true } as any))
