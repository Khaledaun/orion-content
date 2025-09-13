import { NextRequest, NextResponse } from "next/server";
import { enhancedMiddleware } from "@/lib/integration/enhanced-middleware";

export const config = {
  // Enhanced matcher that includes API routes for health monitoring
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ],
};

export async function middleware(request: NextRequest) {
  // Skip middleware for certain paths to avoid infinite loops
  if (request.nextUrl.pathname.startsWith('/_next') || 
      request.nextUrl.pathname.includes('.') ||
      request.nextUrl.pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  try {
    // Use enhanced middleware for comprehensive request processing
    return await enhancedMiddleware(request);
  } catch (error) {
    // Fallback to basic response if enhanced middleware fails
    console.error('Enhanced middleware failed, falling back:', error);
    return NextResponse.next();
  }
}
