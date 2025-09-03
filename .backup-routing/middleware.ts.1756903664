import { NextResponse } from "next/server";

export const config = {
  // Do NOT intercept /api, /_next, or static assets
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};

export function middleware() {
  return NextResponse.next();
}
