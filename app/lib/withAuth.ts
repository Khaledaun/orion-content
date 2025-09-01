import { NextRequest } from "next/server";
import { requireRole, createUnauthorizedResponse, createForbiddenResponse } from "@/lib/rbac";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth";

type Options = { role?: "ADMIN" | "EDITOR" | "VIEWER"; siteId?: string };

export function withAuth<TParams = {}>(
  handler: (req: NextRequest, params: TParams) => Promise<Response>,
  options?: Options
) {
  return async (req: NextRequest, params: TParams) => {
    try {
      if (options?.role) {
        await requireRole(req, options.role, options.siteId);
      } else {
        // Just require a signed-in session
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return createUnauthorizedResponse();
      }
      return handler(req, params);
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (/unauthorized/i.test(msg)) return createUnauthorizedResponse();
      return createForbiddenResponse(options?.role ? `Requires ${options.role}` : "Forbidden");
    }
  };
}
