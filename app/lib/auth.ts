import { getServerSession } from "next-auth";
import type { NextRequest } from "next/server";
import { authOptions } from "./nextauth";
import bcrypt from "bcryptjs";

/** Permissive session type so TS recognizes session.user usage across the app */
export type AuthSession = { user?: { id?: string; email?: string; name?: string; image?: string } } & Record<string, any>;

export async function getSession(): Promise<AuthSession> {
  return (await getServerSession(authOptions as any)) as AuthSession;
}

export async function auth(): Promise<AuthSession> {
  return (await getServerSession(authOptions as any)) as AuthSession;
}

/** Minimal API/page guard. Extend with RBAC when needed. */
export async function requireAuth(_req?: NextRequest, opts: { api?: boolean } = {}) {

/**
 * HOF wrapper for API routes. Usage: export const GET = requireApiAuth(handler, { roles: ["admin"] })
 */
export function requireApiAuth(
  handler: (req: any) => Promise<Response> | Response,
  _opts: { roles?: string[] | string; allowBearer?: boolean } = {}
) {
  return async function(req: any): Promise<Response> {
    await requireAuth(req, { api: true });
    // TODO: add RBAC checks using _opts.roles when your RBAC is wired
    return handler(req);
  };
}
  const session = await getServerSession(authOptions as any);
  const isApi = opts.api ?? !!_req;
  if (!session || !(session as any).user) {
    if (isApi) {
      throw Object.assign(new Error("Unauthorized"), { status: 401 });
    }
    throw Object.assign(new Error("Unauthorized (redirect to login)"), { status: 401 });
  }
  return session as AuthSession;
}

/** Back-compat alias for routes still importing requireApiAuth */
export const requireApiAuth = (req?: NextRequest) => requireAuth(req, { api: true });

/** Password check used in /api/login */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/** Session helpers used by /api/login and /api/logout (NextAuth handles sessions itself).
 *  These are no-ops to satisfy imports; keep if your routes call them.
 */
export async function createSession(_userId: string): Promise<void> {
  // With NextAuth, session is issued by its signIn handler/route.
  return;
}
export async function deleteSession(): Promise<void> {
  // With NextAuth, session is cleared by its signOut handler/route.
  return;
}

/** Minimal AuthError (for legacy imports) */
export class AuthError extends Error {
  status: number
  constructor(message = "Unauthorized", status = 401) {
    super(message); this.name = "AuthError"; this.status = status
  }
}
