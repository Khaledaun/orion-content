import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/** Fully permissive options bag */
export type Options = { [key: string]: any };

export function withAuth(
  handler: (...args: any[]) => Promise<Response> | Response,
  opts: any = {}
) {
  return async function (req: NextRequest, params?: any): Promise<Response> {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user;
    const o = opts || {};
    const roles =
      Array.isArray(o.roles) ? o.roles :
      o.roles ? [String(o.roles)] :
      o.role  ? [String(o.role)]  : [];

    // If handler expects (req, user, roles, params), pass 4 args; else (req, params)
    return handler.length >= 3
      ? handler(req, user, roles, params)
      : handler(req, params);
  };
}
