import { NextRequest, NextResponse } from "next/server";

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

  // For deployment stability, use basic middleware instead of enhanced middleware
  // which has Node.js dependencies incompatible with Edge Runtime
  try {
    // Basic security headers and request processing
    const response = NextResponse.next();
    
    // Add basic security headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
    
    return response;
  } catch (error) {
    // Fallback to basic response if middleware fails
    console.error('Middleware failed, falling back:', error);
    return NextResponse.next();
  }
}
