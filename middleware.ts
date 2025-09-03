import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Exclude API routes, Next internals, and common static assets from middleware
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|woff2?|ttf)).*)',
  ],
};

export default function middleware(_req: NextRequest) {
  // No global rewrites here; let Next's router handle pages & APIs.
  return NextResponse.next();
}
