import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Handlers in your code often use (req, user, roles, params?)
export type WithAuthHandler = (
  req: NextRequest,
  user: any,
  roles: string[],
  params?: any
) => Promise<Response> | Response;

export type Options = {
  roles?: string[] | string; // NEW
  role?: string;             // legacy alias
  allowBearer?: boolean;
};

// Overload 1: preferred signature
export function withAuth(handler: WithAuthHandler, opts?: Options): (req: NextRequest, params?: any) => Promise<Response>;
// Overload 2: legacy minimal handler (req => Response)
export function withAuth(handler: (req: NextRequest, params?: any) => Promise<Response> | Response, opts?: Options): (req: NextRequest, params?: any) => Promise<Response>;
// Implementation
export function withAuth(handler: any, opts: Options = {}) {
  return async function (req: NextRequest, params?: any): Promise<Response> {
    // TODO: implement allowBearer and RBAC check using opts.roles/role
    const session = await auth();
    if (!session || !(session as any).user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = (session as any).user;
    const wanted =
      Array.isArray(opts.roles) ? opts.roles
      : opts.roles ? [opts.roles as string]
      : opts.role ? [opts.role]
      : [];
    // If handler expects (req, user, roles, params), pass 4 args; otherwise 2
    return handler.length >= 3
      ? handler(req, user, wanted, params)
      : handler(req, params);
  };
}
