import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth";

export type Role = "ADMIN" | "EDITOR" | "VIEWER" | (string & {});

function normalizeRoles(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as string[];
  try { const p = typeof raw === "string" ? JSON.parse(raw) : raw; return Array.isArray(p) ? p as string[] : []; } catch { return []; }
}

export async function getAuthUser(_req?: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const u = await prisma.user.findUnique({ where: { id: (session.user as any).id }, select: { roles: true as any } });
  return { userId: (session.user as any).id as string, roles: normalizeRoles(u?.roles) };
}

export function createUnauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
export function createForbiddenResponse(msg = "Forbidden") {
  return NextResponse.json({ error: msg }, { status: 403 });
}

export async function requireRole(req: NextRequest, role: Role, _siteId?: string) {
  // Bearer first
  const authz = req.headers.get("authorization") || "";
  const bearer = authz.toLowerCase().startsWith("bearer ") ? authz.slice(7).trim() : "";
  if (bearer) {
    const tok = await prisma.connection.findFirst({
      where: { kind: "console_api_token", secret: bearer, disabledAt: null } as any,
      select: { userId: true },
    });
    if (!tok) throw new Error("unauthorized");
    const u = await prisma.user.findUnique({ where: { id: tok.userId }, select: { roles: true as any } });
    const roles = normalizeRoles(u?.roles);
    if (!roles.includes(role)) throw new Error("forbidden");
    return { userId: tok.userId, roles };
  }

  // Session fallback
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("unauthorized");
  const u = await prisma.user.findUnique({ where: { id: (session.user as any).id }, select: { roles: true as any } });
  const roles = normalizeRoles(u?.roles);
  if (!roles.includes(role)) throw new Error("forbidden");
  return { userId: (session.user as any).id as string, roles };
}

export async function requireEditAccess(req: NextRequest, siteId?: string) {
  // Simple EDITOR/ADMIN gate; extend with siteId checks if needed
  try { return await requireRole(req, "ADMIN", siteId); } catch {}
  return requireRole(req, "EDITOR", siteId);
}
