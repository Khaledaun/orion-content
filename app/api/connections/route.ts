
import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/connections — list connections (admin only; no secrets returned)
async function handler(req: NextRequest) {
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
}

export async function GET(req: NextRequest) {
  try {
    await requireApiAuth(req, { roles: ["admin"] })
    return await handler(req)
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
