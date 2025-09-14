/**
 * Enhanced Middleware Integration
 * Phase 1 Enhancement: Integration of all enhanced middleware components
 */

import { NextRequest, NextResponse } from "next/server";
import { middlewareStack } from "@/lib/architecture/middleware-stack";
import { errorHandler } from "@/lib/architecture/error-handler";
import { serviceContainer } from "@/lib/architecture/service-container";
import { logger } from "@/lib/logger";

// Enhanced middleware that integrates all Phase 1 improvements
export async function enhancedMiddleware(
  request: NextRequest,
): Promise<NextResponse> {
  try {
    // Create request scope for dependency injection
    const requestScope = serviceContainer.createScope(
      `req_${Date.now()}_${Math.random()}`,
    );

    // Add request-specific services to scope
    const requestLogger = logger.child({
      requestId: requestScope.getId(),
      path: request.nextUrl.pathname,
      method: request.method,
    });

    // Process request through middleware stack
    const response = await middlewareStack.process(request);

    // Clean up request scope
    await requestScope.dispose();

    return response;
  } catch (error) {
    // Handle errors through enhanced error handler
    logger.error("Enhanced middleware error", {
      path: request.nextUrl.pathname,
      method: request.method,
      error: error instanceof Error ? error.message : String(error),
    });

    return errorHandler.handleError(
      error instanceof Error ? error : new Error(String(error)),
      request,
    );
  }
}

// Register enhanced middleware components
export function setupEnhancedMiddleware(): void {
  logger.info("Setting up enhanced middleware components");

  // Database health monitoring middleware
  middlewareStack.use(
    "database-health",
    async (request, context, next) => {
      const dbHealthy = await import("@/lib/database/connection-manager").then(
        ({ dbManager }) => dbManager.performHealthCheck(),
      );

      if (!dbHealthy) {
        logger.warn("Database health check failed during request processing", {
          requestId: context.requestId,
          path: request.nextUrl.pathname,
        });

        return new NextResponse(
          JSON.stringify({
            error: "Service temporarily unavailable",
            code: "DATABASE_UNAVAILABLE",
          }),
          {
            status: 503,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": "30",
            },
          },
        );
      }

      return next();
    },
    {
      order: 5,
      conditions: [{ type: "path", matcher: /^\/api\//, negate: false }],
    },
  );

  // Performance monitoring middleware
  middlewareStack.use(
    "performance-monitoring",
    async (request, context, next) => {
      const startTime = Date.now();
      const response = await next();
      const duration = Date.now() - startTime;

      // Record performance metrics
      context.metadata.set("responseTime", duration);

      // Add performance headers
      response.headers.set("X-Response-Time", `${duration}ms`);
      response.headers.set("Server-Timing", `app;dur=${duration}`);

      // Log slow requests
      if (duration > 2000) {
        logger.warn("Slow request detected", {
          requestId: context.requestId,
          path: request.nextUrl.pathname,
          method: request.method,
          duration,
        });
      }

      return response;
    },
    { order: 15 },
  );

  // Enhanced error handling middleware
  middlewareStack.use(
    "error-handling",
    async (request, context, next) => {
      try {
        return await next();
      } catch (error) {
        logger.error("Middleware chain error", {
          requestId: context.requestId,
          path: request.nextUrl.pathname,
          error: error instanceof Error ? error.message : String(error),
        });

        return errorHandler.handleError(
          error instanceof Error ? error : new Error(String(error)),
          request,
          { requestId: context.requestId },
        );
      }
    },
    { order: 1 },
  );

  // Service container middleware for dependency injection
  middlewareStack.use(
    "service-container",
    async (request, context, next) => {
      const scope = serviceContainer.createScope(context.requestId);
      context.metadata.set("serviceScope", scope);

      try {
        const response = await next();
        await scope.dispose();
        return response;
      } catch (error) {
        await scope.dispose();
        throw error;
      }
    },
    { order: 8 },
  );

  logger.info("Enhanced middleware setup completed");
}

// Initialize enhanced middleware on module load
setupEnhancedMiddleware();
