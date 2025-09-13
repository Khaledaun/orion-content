import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Build-time safety check - completely disable middleware during Vercel builds
const isBuildTime = process.env.VERCEL === '1' && !process.env.DATABASE_URL;

// Exclude API routes, Next internals, and common static assets from middleware
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|woff2?|ttf)).*)',
  ],
};

export default function middleware(_req: NextRequest) {
  // During build time, immediately return next
  if (isBuildTime) {
    return NextResponse.next();
  }
  
  // No global rewrites here; let Next's router handle pages & APIs.
  return NextResponse.next();
}
