import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  rateLimiter,
  RATE_LIMIT_CONFIGS,
  getClientIdentifier,
  createRateLimitResponse,
} from "./lib/security/rate-limiter";
import { auditLogger } from "./lib/security/audit-logger";
import { env } from "./lib/env/validation";

// Define protected routes and their required roles
const PROTECTED_ROUTES = {
  "/admin": ["ADMIN"],
  "/api/admin": ["ADMIN"],
  "/api/users": ["ADMIN", "EDITOR"],
  "/api/roles": ["ADMIN"],
  "/api/permissions": ["ADMIN"],
  "/dashboard": ["ADMIN", "EDITOR", "VIEWER"],
  "/profile": ["ADMIN", "EDITOR", "VIEWER"],
} as const;

// Define rate limit configurations for different routes
const ROUTE_RATE_LIMITS = {
  "/api/auth/signin": RATE_LIMIT_CONFIGS.AUTH_LOGIN,
  "/api/auth/signup": RATE_LIMIT_CONFIGS.AUTH_REGISTER,
  "/api/auth/reset-password": RATE_LIMIT_CONFIGS.AUTH_PASSWORD_RESET,
  "/api/auth/2fa": RATE_LIMIT_CONFIGS.TWO_FACTOR_VERIFY,
  "/api/search": RATE_LIMIT_CONFIGS.SEARCH,
  "/api/upload": RATE_LIMIT_CONFIGS.FILE_UPLOAD,
  "/api": RATE_LIMIT_CONFIGS.API_GENERAL,
} as const;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const clientId = getClientIdentifier(request);

  try {
    // Skip middleware for static files and Next.js internals
    if (
      pathname.startsWith("/_next/") ||
      pathname.startsWith("/static/") ||
      pathname.includes(".") ||
      pathname === "/favicon.ico"
    ) {
      return NextResponse.next();
    }

    // Apply rate limiting
    const rateLimitResult = await applyRateLimit(request, pathname, clientId);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Check authentication for protected routes
    const authResult = await checkAuthentication(request, pathname);
    if (authResult) {
      return authResult;
    }

    // Log successful request
    await logRequest(request, "SUCCESS");

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);

    // Log error
    await auditLogger.logSystem({
      action: "MIDDLEWARE_ERROR",
      resource: "middleware",
      details: {
        pathname,
        error: error instanceof Error ? error.message : "Unknown error",
        clientId,
      },
      ip: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    // Fail open - allow request to continue
    return NextResponse.next();
  }
}

/**
 * Apply rate limiting based on route
 */
async function applyRateLimit(
  request: NextRequest,
  pathname: string,
  clientId: string,
): Promise<NextResponse | null> {
  // Find matching rate limit configuration
  let rateLimitConfig = null;

  for (const [route, config] of Object.entries(ROUTE_RATE_LIMITS)) {
    if (pathname.startsWith(route)) {
      rateLimitConfig = config;
      break;
    }
  }

  if (!rateLimitConfig) {
    return null; // No rate limiting for this route
  }

  try {
    const result = await rateLimiter.checkRateLimit({
      identifier: clientId,
      config: rateLimitConfig,
    });

    if (!result.allowed) {
      // Log rate limit violation
      await auditLogger.logSecurity({
        action: "RATE_LIMIT_EXCEEDED",
        resource: "rate_limiter",
        details: {
          pathname,
          clientId,
          totalHits: result.totalHits,
          limit: rateLimitConfig.maxRequests,
          windowMs: rateLimitConfig.windowMs,
        },
        ip: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      });

      const rateLimitResponse = createRateLimitResponse(
        result,
        rateLimitConfig,
      );
      return new NextResponse(rateLimitResponse.body, {
        status: rateLimitResponse.status,
        headers: rateLimitResponse.headers,
      });
    }

    // Add rate limit headers to successful responses
    const response = NextResponse.next();
    response.headers.set(
      "X-RateLimit-Limit",
      rateLimitConfig.maxRequests.toString(),
    );
    response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
    response.headers.set(
      "X-RateLimit-Reset",
      result.resetTime.getTime().toString(),
    );

    return null; // Continue processing
  } catch (error) {
    console.error("Rate limiting error:", error);
    return null; // Fail open
  }
}

/**
 * Check authentication and authorization
 */
async function checkAuthentication(
  request: NextRequest,
  pathname: string,
): Promise<NextResponse | null> {
  // Find matching protected route
  let requiredRoles: string[] | null = null;

  for (const [route, roles] of Object.entries(PROTECTED_ROUTES)) {
    if (pathname.startsWith(route)) {
      requiredRoles = [...roles]; // Convert readonly array to mutable array
      break;
    }
  }

  if (!requiredRoles) {
    return null; // Route is not protected
  }

  try {
    // Get token from request
    const token = await getToken({
      req: request,
      secret: env.NEXTAUTH_SECRET,
    });

    if (!token) {
      await logAuthFailure(request, "NO_TOKEN", pathname);
      return redirectToLogin(request);
    }

    // Check if user has required roles
    const userRoles = (token.roles as string[]) || [];
    const hasRequiredRole = requiredRoles.some((role) =>
      userRoles.includes(role),
    );

    if (!hasRequiredRole) {
      await logAuthFailure(
        request,
        "INSUFFICIENT_PERMISSIONS",
        pathname,
        token.sub as string,
      );
      return createForbiddenResponse();
    }

    // Check if token is expired (additional check)
    if (token.exp && Date.now() >= (token.exp as number) * 1000) {
      await logAuthFailure(
        request,
        "TOKEN_EXPIRED",
        pathname,
        token.sub as string,
      );
      return redirectToLogin(request);
    }

    // Log successful authentication
    await auditLogger.logAuth({
      userId: token.sub as string,
      action: "ACCESS_GRANTED",
      resource: "route",
      resourceId: pathname,
      details: {
        userRoles,
        requiredRoles,
      },
      ip: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    });

    return null; // Authentication successful
  } catch (error) {
    console.error("Authentication error:", error);
    await logAuthFailure(request, "AUTH_ERROR", pathname);
    return redirectToLogin(request);
  }
}

/**
 * Log authentication failure
 */
async function logAuthFailure(
  request: NextRequest,
  reason: string,
  pathname: string,
  userId?: string,
): Promise<void> {
  await auditLogger.logSecurity({
    userId,
    action: "ACCESS_DENIED",
    resource: "route",
    resourceId: pathname,
    details: {
      reason,
      pathname,
    },
    ip: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
    userAgent: request.headers.get("user-agent") || "unknown",
  });
}

/**
 * Log successful request
 */
async function logRequest(request: NextRequest, status: string): Promise<void> {
  // Only log API requests and sensitive routes to avoid spam
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/") ||
    Object.keys(PROTECTED_ROUTES).some((route) => pathname.startsWith(route))
  ) {
    await auditLogger.log({
      action: "REQUEST_PROCESSED",
      resource: "middleware",
      details: {
        pathname,
        method: request.method,
        status,
      },
      ip: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
      severity: "LOW",
    });
  }
}

/**
 * Redirect to login page
 */
function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", request.url);
  return NextResponse.redirect(loginUrl);
}

/**
 * Create forbidden response
 */
function createForbiddenResponse(): NextResponse {
  return new NextResponse(
    JSON.stringify({
      error: "Forbidden",
      message: "You do not have permission to access this resource",
    }),
    {
      status: 403,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
