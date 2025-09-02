import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/withAuth"

async function handler(_req: NextRequest) {
  // TODO: real jobrun logic
  return NextResponse.json({ ok: true })
}

export const POST = withAuth(handler, { roles: ["admin", "editor"] })
