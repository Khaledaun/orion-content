export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { getServerSession } from "next-auth";
import type { NextRequest } from "next/server";
import { authOptions } from "./nextauth";
import bcrypt from "bcryptjs";

// Enhanced build-time safety check
const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL;
const isVercelBuild = process.env.VERCEL === '1' && !process.env.DATABASE_URL;

/** Permissive session type used across the app */
export type AuthSession = {
  user?: { id?: string; email?: string; name?: string; image?: string };
} & Record<string, any>;

export async function getSession(): Promise<AuthSession> {
  if (isBuildTime || isVercelBuild) {
    return {};
  }
  try {
    return (await getServerSession(authOptions as any)) as AuthSession;
  } catch (error) {
    console.error('Session error during build:', error);
    return {};
  }
}

export async function auth(): Promise<AuthSession> {
  if (isBuildTime || isVercelBuild) {
    return {};
  }
  try {
    return (await getServerSession(authOptions as any)) as AuthSession;
  } catch (error) {
    console.error('Auth error during build:', error);
    return {};
  }
}

/** Minimal guard. Extend with RBAC when ready. */
export async function requireAuth(_req?: NextRequest, opts: { api?: boolean } = {}) {
  if (isBuildTime || isVercelBuild) {
    // During build time, return a mock session to prevent build failures
    return { user: { id: 'build-time-mock', email: 'build@example.com', name: 'Build User' } };
  }
  
  try {
    const session = (await getServerSession(authOptions as any)) as AuthSession;
    const isApi = opts.api ?? !!_req;
    if (!session?.user) {
      const err = new AuthError(isApi ? "Unauthorized" : "Unauthorized (redirect to login)", 401);
      throw err;
    }
    return session;
  } catch (error) {
    if (isBuildTime || isVercelBuild) {
      return { user: { id: 'build-time-mock', email: 'build@example.com', name: 'Build User' } };
    }
    throw error;
  }
}

/** HOF wrapper for API routes: export const GET = requireApiAuth(handler, { roles: ["admin"] }) */
export function requireApiAuth(
  handler: (req: any) => Promise<Response> | Response,
  _opts: { roles?: string[] | string; allowBearer?: boolean } = {}
) {
  return async function(req: any): Promise<Response> {
    if (isBuildTime || isVercelBuild) {
      return new Response(JSON.stringify({ message: "Build time mode" }), { status: 200 });
    }
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
