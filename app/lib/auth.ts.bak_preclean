import { getServerSession } from "next-auth";
import type { NextRequest } from "next/server";
import { authOptions } from "./nextauth";
import { prisma } from "@/lib/prisma";

/** Session type from NextAuth */
export type AuthSession = Awaited<ReturnType<typeof getServerSession>>;

/** Lightweight role row (adjust to your schema if needed) */
type UserRoleRow = { role: string | null };

/** Get a NextAuth session (server) */
export async function getSession(): Promise<AuthSession> {
  return getServerSession(authOptions as any);
}

/** Alias used across the app */
export async function auth(): Promise<AuthSession> {
  return getServerSession(authOptions as any);
}

/**
 * Return all roles in the system, lowercased.
 * If your schema differs, adjust the Prisma query.
 */
export async function listRoles(): Promise<string[]> {
  const rows: UserRoleRow[] = await prisma.user.findMany({
    select: { role: true },
  });
  return rows
    .map((r: UserRoleRow) => (r.role ?? "").toLowerCase())
    .filter(Boolean);
}

/**
 * Minimal requireAuth helper. Extend with RBAC checks when ready.
 * - If unauthenticated and api=true: throw 401 (caller should catch).
 * - If unauthenticated and api=false: redirect to login (TODO).
 */
export async function requireAuth(
  _req?: NextRequest,
  opts: { api?: boolean } = {}
) {
  const session = await getServerSession(authOptions as any);
  const isApi = opts.api ?? !!_req;

  if (!session?.user) {
    if (isApi) {
      // Let callers return a 401 JSON; we throw to bubble up within route handlers
      throw Object.assign(new Error("Unauthorized"), { status: 401 });
    } else {
      // TODO: implement redirect("/login") when using in pages
      throw Object.assign(new Error("Unauthorized (redirect to login)"), {
        status: 401,
      });
    }
  }
  return session;
}
