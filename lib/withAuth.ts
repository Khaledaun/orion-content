import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export type WithAuthHandler = (
  req: NextRequest,
  user: any,
  roles: string[],
  params?: any
) => Promise<Response> | Response;

export type Options = {
  roles?: string[] | string;   // NEW: supports array or single
  role?: string;               // legacy alias
  allowBearer?: boolean;
};

export function withAuth(handler: WithAuthHandler, opts: Options = {}) {
  return async function (req: NextRequest, params?: any): Promise<Response> {
    // TODO: implement allowBearer token logic here if needed
    const session = await auth();
    if (!session || !(session as any).user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = (session as any).user;

    const wanted =
      Array.isArray(opts.roles)
        ? opts.roles
        : opts.roles
        ? [opts.roles as string]
        : opts.role
        ? [opts.role]
        : [];

    return handler(req, user, wanted, params);
  };
}
