export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { prisma } from "@/lib/prisma";

// GET /api/daily-picks?date=YYYY-MM-DD&site=SITE_KEY&count=3
export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const siteKey = searchParams.get("site");
  const count = parseInt(searchParams.get("count") || "3", 10);

  if (!date || !siteKey) {
    return NextResponse.json(
      { error: "date and site parameters are required" },
      { status: 400 }
    );
  }

  // Placeholder implementation since site/week/topic models don't exist yet
  // This would be replaced with actual daily picks logic once models are implemented
  const mockPicks = Array.from({ length: count }, (_, i) => ({
    id: `mock-${i + 1}`,
    title: `Sample Topic ${i + 1} for ${siteKey}`,
    categoryName: `Category ${i + 1}`,
    siteName: siteKey,
    date: date,
    approved: true,
    note: 'Placeholder data - requires site/week/topic models'
  }));

  return NextResponse.json({ 
    picks: mockPicks,
    note: 'Placeholder implementation - requires site/week/topic models'
  });
}, ({ roles: ["admin", "user"], allowBearer: true } as any));