export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import { prisma } from "@/lib/prisma";

// GET /api/connections — list connections (admin only; no secrets returned)
export const GET = withAuth(async (_req) => {
  const connections = await prisma.connection.findMany({
    select: {
      id: true,
      kind: true,
      createdAt: true,
      updatedAt: true,
      // NEVER return secret here
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ connections });
}, ({ roles: ["admin"], allowBearer: true } as any));
