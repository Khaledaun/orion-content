import { NextRequest } from "next/server"

type AnyHandler = (req: NextRequest) => Response | Promise<Response>
type Options = { roles?: string[] } & Record<string, any>

// NOTE: Temporary no-op auth wrapper – replace with your real enforcement later.
export function withAuth(handler: AnyHandler, _opts: Options = {}): AnyHandler {
  return (req: NextRequest) => handler(req)
}
export default withAuth
