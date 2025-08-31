// lib/auth.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth";
import { prisma } from "@/lib/prisma";

/** JSON-returning auth error for API routes (or redirect wrapper for non-API). */
export class AuthError extends Error {
  status: number;
  body: any;
  constructor(status: number, body: any) {
    super(typeof body === "string" ? body : body?.error ?? "Unauthorized");
    this.status = status;
    this.body = body;
  }
}

export type Role = "ADMIN" | "EDITOR" | "VIEWER" | (string & {});
export type AuthContext = { userId: string; roles: Role[]; via: "session" | "bearer" };
export type RequireAuthOpts = { api?: boolean; roles?: Role[]; allowBearer?: boolean };

function normalizeRoles(raw: unknown): Role[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as Role[];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? (parsed as Role[]) : [];
  } catch { return []; }
}

async function rolesForUser(userId: string): Promise<Role[]> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true as any }, // adjust if your schema differs
  });
  return normalizeRoles(u?.roles);
}

/** Main auth helper: Bearer first, then session. */
export async function requireAuth(
  req: NextRequest,
  opts: RequireAuthOpts = {}
): Promise<AuthContext> {
  const { api = true, roles, allowBearer = true } = opts;

  // Bearer token path
  const authz = req.headers.get("authorization") || "";
  const bearer = authz.toLowerCase().startsWith("bearer ") ? authz.slice(7).trim() : "";
  if (allowBearer && bearer) {
    const token = await prisma.connection.findFirst({
      // remove disabledAt if your schema lacks it:
      where: { kind: "console_api_token", secret: bearer, disabledAt: null } as any,
      select: { userId: true },
    });
    if (!token) throw new AuthError(401, { error: "Invalid token" });

    const userRoles = await rolesForUser(token.userId);
    if (roles && !roles.some((r) => userRoles.includes(r)))
      throw new AuthError(403, { error: "Insufficient role" });

    return { userId: token.userId, roles: userRoles, via: "bearer" };
  }

  // Session path
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    if (api) throw new AuthError(401, { error: "Unauthorized" });
    throw new AuthError(302, NextResponse.redirect(new URL("/signin", req.url)));
  }

  const userRoles = await rolesForUser(session.user.id);
  if (roles && !roles.some((r) => userRoles.includes(r)))
    throw new AuthError(403, { error: "Insufficient role" });

  return { userId: session.user.id, roles: userRoles, via: "session" };
}

/** Back-compat shim for legacy routes. */
export async function requireApiAuth(
  req: NextRequest,
  opts?: Omit<RequireAuthOpts, "api">
): Promise<AuthContext> {
  return requireAuth(req, { api: true, allowBearer: true, ...opts });
}
