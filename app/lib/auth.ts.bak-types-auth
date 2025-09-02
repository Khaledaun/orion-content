import { NextRequest } from "next/server";
import { headers as nextHeaders } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "./nextauth";
import { prisma } from "@/lib/prisma";

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

function normalizeRoles(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as string[];
  try {
    const p = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(p) ? (p as string[]) : [];
  } catch {
    return [];
  }
}

// Read roles from the user_roles relation table
async function rolesForUser(userId: string): Promise<string[]> {
  try {
    const rows = await prisma.userRole.findMany({
      where: { userId },
      select: { role: true },
    });
    return rows.map((r) => String(r.role).toLowerCase());
  } catch {
    // If anything goes wrong, fall back to empty roles
    return [];
  }
}

/**
 * Session-first auth:
 * - In API mode (api:true) => throw AuthError 401/403
 * - In page mode (api:false) => redirect("/login") when unauth
 */
export async function requireAuth(req?: NextRequest, opts: RequireAuthOpts = {}): Promise<AuthContext> {
  const defaultApi = !!req;
  const { api = defaultApi, roles } = opts;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    if (api) throw new AuthError(401, { error: "Unauthorized" });
    redirect("/login");
  }

  const userId = (session!.user as any).id as string;
  const userRoles = await rolesForUser(userId);

  if (roles && !roles.some((r) => userRoles.includes(String(r).toLowerCase()))) {
    if (api) throw new AuthError(403, { error: "Insufficient role" });
    redirect("/login");
  }

  return { userId, roles: userRoles as any, via: "session" };
}

/** Legacy shim for routes that still import requireApiAuth */
export async function requireApiAuth(req?: NextRequest, opts?: Omit<RequireAuthOpts, "api">): Promise<AuthContext> {
  return requireAuth(req, { api: true, ...opts });
}

/* Utility helpers kept for compatibility */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  const bcryptjs = await import("bcryptjs");
  try { return await bcryptjs.compare(plain, hash); } catch { return false; }
}
export async function getSession() { return getServerSession(authOptions); }
export async function createSession(..._args: any[]): Promise<void> { return; }
export async function deleteSession(..._args: any[]): Promise<void> { return; }
