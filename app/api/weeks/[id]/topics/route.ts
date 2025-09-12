export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";

export const GET = withAuth(async (req: NextRequest) => {
  const urlParts = req.url.split('/')
  const weekId = urlParts[urlParts.indexOf('weeks') + 1]
  
  const mockTopics = [
    {
      id: `topic-${weekId}-1`,
      title: 'Sample Topic 1',
      weekId,
      approved: true,
      note: 'Placeholder - requires topic model implementation'
    }
  ]
  
  return NextResponse.json({ topics: mockTopics })
}, ({ roles: ["admin", "user"], allowBearer: true } as any))
