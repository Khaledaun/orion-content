import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./nextauth"; // relative to avoid alias quirks
import { prisma } from "@/lib/prisma";

export class AuthError extends Error {
  status: number; body: any;
  constructor(status: number, body: any) {
    super(typeof body === "string" ? body : body?.error ?? "Unauthorized");
    this.status = status; this.body = body;
  }
}
export type Role = "ADMIN" | "EDITOR" | "VIEWER" | (string & {});
export type AuthContext = { userId: string; roles: Role[]; via: "session" | "bearer" };
export type RequireAuthOpts = { api?: boolean; roles?: Role[]; allowBearer?: boolean };

function normalizeRoles(raw: unknown): string[] {
  if (!raw) return []; if (Array.isArray(raw)) return raw as string[];
  try { const p = typeof raw === "string" ? JSON.parse(raw) : raw; return Array.isArray(p) ? p as string[] : []; } catch { return []; }
}
async function rolesForUser(userId: string): Promise<string[]> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { roles: true as any } });
  return normalizeRoles(u?.roles);
}

/** Bearer first, then session; JSON 401/403 in API mode. */
export async function requireAuth(req: NextRequest, opts: RequireAuthOpts = {}): Promise<AuthContext> {
  const { api = true, roles, allowBearer = true } = opts;

  // Bearer
  const authz = req.headers.get("authorization") || "";
  const bearer = authz.toLowerCase().startsWith("bearer ") ? authz.slice(7).trim() : "";
  if (allowBearer && bearer) {
    const token = await prisma.connection.findFirst({
      where: { kind: "console_api_token", secret: bearer, disabledAt: null } as any,
      select: { userId: true },
    });
    if (!token) throw new AuthError(401, { error: "Invalid token" });
    const userRoles = await rolesForUser(token.userId);
    if (roles && !roles.some(r => userRoles.includes(r))) throw new AuthError(403, { error: "Insufficient role" });
    return { userId: token.userId, roles: userRoles as Role[], via: "bearer" };
  }

  // Session
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    if (api) throw new AuthError(401, { error: "Unauthorized" });
    throw new AuthError(302, NextResponse.redirect(new URL("/signin", req.url)));
  }
  const userRoles = await rolesForUser((session.user as any).id);
  if (roles && !roles.some(r => userRoles.includes(r))) throw new AuthError(403, { error: "Insufficient role" });
  return { userId: (session.user as any).id as string, roles: userRoles as Role[], via: "session" };
}

/** Legacy shim for routes that still import requireApiAuth */
export async function requireApiAuth(req: NextRequest, opts?: Omit<RequireAuthOpts, "api">): Promise<AuthContext> {
  return requireAuth(req, { api: true, allowBearer: true, ...opts });
}

/* Legacy helpers kept for compatibility */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  const bcryptjs = await import("bcryptjs");
  try { return await bcryptjs.compare(plain, hash); } catch { return false; }
}
export async function getSession() { return getServerSession(authOptions); }
export async function createSession(..._args: any[]): Promise<void> { return; }
export async function deleteSession(..._args: any[]): Promise<void> { return; }
