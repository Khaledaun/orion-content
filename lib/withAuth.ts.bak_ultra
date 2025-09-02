import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Permissive wrapper that works with both:
 *   - handler(req, user, roles, params)
 *   - handler(req, params)
 * And accepts any options object (roles, role, allowBearer, etc.)
 */
export function withAuth(
  handler: (...args: any[]) => Promise<Response> | Response,
  opts?: any
) {
  return async function (req: NextRequest, params?: any): Promise<Response> {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user;
    const roles =
      Array.isArray(opts?.roles) ? opts.roles :
      opts?.roles ? [String(opts.roles)] :
      opts?.role  ? [String(opts.role)]  : [];

    // If handler expects (req, user, roles, params), pass 4 args; else (req, params)
    return handler.length >= 3
      ? handler(req, user, roles, params)
      : handler(req, params);
  };
}
