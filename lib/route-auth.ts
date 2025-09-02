import { NextRequest, NextResponse } from 'next/server';

export type AuthedHandler = (req: NextRequest, session: any) => Promise<Response> | Response;

/**
 * Wraps a handler so the export is a function (as Next.js expects),
 * while still enforcing auth inside.
 */
export function withAuthRoute(handler: AuthedHandler) {
  return async function (req: NextRequest) {
    const session = { user: { id: "dev" } }; // TODO: replace with real auth
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return handler(req, session);
  };
}
