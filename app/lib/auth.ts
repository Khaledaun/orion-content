import { getServerSession } from "next-auth";
import type { NextRequest } from "next/server";
import { authOptions } from "./nextauth";
import bcrypt from "bcryptjs";

/** Permissive session type used across the app */
export type AuthSession = {
  user?: { id?: string; email?: string; name?: string; image?: string };
} & Record<string, any>;

export async function getSession(): Promise<AuthSession> {
  try {
    return (await getServerSession(authOptions as any)) as AuthSession;
  } catch (error) {
    console.error("Session error:", error);
    return {};
  }
}
export async function auth(): Promise<AuthSession> {
  try {
    return (await getServerSession(authOptions as any)) as AuthSession;
  } catch (error) {
    console.error("Auth error:", error);
    return {};
  }
}

/** Minimal guard. Extend with RBAC when ready. */
export async function requireAuth(_req?: NextRequest, opts: { api?: boolean } = {}) {
  try {
    const session = (await getServerSession(authOptions as any)) as AuthSession;
    const isApi = opts.api ?? !!_req;
    if (!session?.user) {
      const err = new AuthError(isApi ? "Unauthorized" : "Unauthorized (redirect to login)", 401);
      throw err;
    }
    return session;
  } catch (error) {
    const isApi = opts.api ?? !!_req;
    if (error instanceof AuthError) {
      throw error;
    }
    console.error("Auth check error:", error);
    const err = new AuthError(isApi ? "Authentication service unavailable" : "Authentication service unavailable", 503);
    throw err;
  }
}

/** HOF wrapper for API routes: export const GET = requireApiAuth(handler, { roles: ["admin"] }) */
export function requireApiAuth(
  handler: (req: any) => Promise<Response> | Response,
  _opts: { roles?: string[] | string; allowBearer?: boolean } = {}
) {
  return async function(req: any): Promise<Response> {
    await requireAuth(req, { api: true });
    // TODO: apply RBAC checks using _opts.roles when rbac is wired.
    return handler(req);
  };
}

/** Legacy helpers used in login/logout routes (NextAuth manages sessions) */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try { return await bcrypt.compare(plain, hash); } catch { return false; }
}
export async function createSession(_userId: string, _email?: string): Promise<void> { return; }
export async function deleteSession(): Promise<void> { return; }

/** Minimal AuthError (for legacy imports) */
export class AuthError extends Error {
  status: number;
  constructor(message = "Unauthorized", status = 401) {
    super(message); this.name = "AuthError"; this.status = status;
  }
}
