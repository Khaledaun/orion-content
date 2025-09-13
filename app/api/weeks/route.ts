export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";

export const GET = withAuth(async () => {
  const mockWeeks = [
    {
      id: 'week-1',
      status: 'ACTIVE',
      startDate: new Date().toISOString(),
      note: 'Placeholder - requires week model implementation'
    }
  ]
  return NextResponse.json({ weeks: mockWeeks })
}, ({ roles: ["admin", "user"], allowBearer: true } as any))

export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json()
  const mockWeek = {
    id: `week-${Date.now()}`,
    ...body,
    createdAt: new Date().toISOString(),
    note: 'Placeholder - requires week model implementation'
  }
  return NextResponse.json({ week: mockWeek })
}, ({ roles: ["admin"], allowBearer: true } as any))
