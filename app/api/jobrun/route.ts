import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/withAuth"

// keep your existing logic in here
async function handler(req: NextRequest) {
  // TODO: replace with your actual jobrun logic
  return NextResponse.json({ ok: true })
}

// export the handler wrapped with role-based auth
export const POST = withAuth(handler, { roles: ["admin", "editor"] })
