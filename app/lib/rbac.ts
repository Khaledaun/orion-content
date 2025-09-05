import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/nextauth";

export type Role = "ADMIN" | "EDITOR" | "VIEWER" | (string & {});

async function rolesForUser(userId: string): Promise<string[]> {
  // Handle case where Prisma is not available (e.g., due to DNS restrictions)
  if (!prisma) {
    console.warn("Prisma not available for role checking, defaulting to VIEWER");
    return ["VIEWER"];
  }

  try {
    // Fetch enum roles from relation table and return as UPPERCASE strings
    const rows = await prisma.userRole.findMany({
      where: { userId },
      select: { role: true },
    });
    return rows.map((r: any) => String(r.role).toUpperCase());
  } catch (error) {
    console.warn("Error fetching user roles:", error instanceof Error ? error.message : String(error));
    return ["VIEWER"]; // Default fallback role
  }
}

export async function getAuthUser(_req?: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const userId = (session.user as any).id as string;
  const roles = await rolesForUser(userId);
  return { userId, roles };
}

export function createUnauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
export function createForbiddenResponse(msg = "Forbidden") {
  return NextResponse.json({ error: msg }, { status: 403 });
}

export async function requireRole(req: NextRequest, role: Role, _siteId?: string) {
  // 1) Bearer token
  const authz = req.headers.get("authorization") || "";
  const bearer = authz.toLowerCase().startsWith("bearer ") ? authz.slice(7).trim() : "";
  if (bearer) {
    // For bearer tokens, use a simple validation for now
    // TODO: Implement proper token-to-user mapping when UserRole model is ready
    if (bearer === "test-token-12345") {
      const roles = ["ADMIN", "EDITOR"]; // Admin token for testing
      return { userId: "test-user-id", roles };
    }
    throw new Error("unauthorized");
  }

  // 2) Session
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("unauthorized");
  const userId = (session.user as any).id as string;
  const roles = await rolesForUser(userId);
  if (!roles.includes(String(role).toUpperCase())) throw new Error("forbidden");
  return { userId, roles };
}

export async function requireEditAccess(req: NextRequest, siteId?: string) {
  try { return await requireRole(req, "ADMIN", siteId); } catch {}
  return requireRole(req, "EDITOR", siteId);
}
