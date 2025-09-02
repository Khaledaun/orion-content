import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth";

type RequireAuthOpts = Parameters<typeof requireAuth>[1];
type Handler<T> = (req: NextRequest, ctx: { auth: Awaited<ReturnType<typeof requireAuth>> }) => Promise<T>;

export function withAuth<T = NextResponse>(handler: Handler<T>, opts?: RequireAuthOpts) {
  return async (req: NextRequest): Promise<T | NextResponse> => {
    try {
      const auth = await requireAuth(req, { api: true, ...opts });
      return await handler(req, { auth });
    } catch (e: any) {
      if (e instanceof AuthError) {
        if (e.status === 302 && e.body instanceof NextResponse) return e.body;
        return NextResponse.json(e.body ?? { error: e.message }, { status: e.status });
      }
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  };
}
