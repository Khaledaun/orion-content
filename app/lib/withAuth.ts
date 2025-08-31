import { NextRequest } from "next/server";
import { requireRole, createUnauthorizedResponse, createForbiddenResponse } from "@/lib/rbac";

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
        // treat VIEWER as "must be signed in"
        await requireRole(req, "VIEWER");
      }
      return handler(req, params);
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (/unauthorized/i.test(msg)) return createUnauthorizedResponse();
      return createForbiddenResponse(options?.role ? `Requires ${options.role}` : "Forbidden");
    }
  };
}
