import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/withAuth"

async function handler(req: NextRequest) {
  // TODO: your actual jobrun logic here
  return NextResponse.json({ ok: true })
}

export const POST = withAuth(handler, { roles: ["admin", "editor"] })
