/**
 * Enterprise Middleware Stack
 * Phase 1 Enhancement: Advanced request processing and middleware composition
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export type MiddlewareFunction = (
  request: NextRequest,
  context: MiddlewareContext,
  next: () => Promise<NextResponse>,
) => Promise<NextResponse>;

export interface MiddlewareContext {
  requestId: string;
  startTime: number;
  metadata: Map<string, any>;
  user?: any;
  session?: any;
}

interface MiddlewareDefinition {
  _name: string;
  middleware: MiddlewareFunction;
  order: number;
  enabled: boolean;
  conditions?: MiddlewareCondition[];
}

interface MiddlewareCondition {
  type: "path" | "method" | "header" | "query" | "custom";
  matcher: string | RegExp | ((request: NextRequest) => boolean);
  negate?: boolean;
}

export class MiddlewareStack {
  private static instance: MiddlewareStack;
  private middlewares: Map<string, MiddlewareDefinition> = new Map();
  private globalMiddlewares: MiddlewareFunction[] = [];

  private constructor() {
    this.setupBuiltinMiddlewares();
  }

  public static getInstance(): MiddlewareStack {
    if (!MiddlewareStack.instance) {
      MiddlewareStack.instance = new MiddlewareStack();
    }
    return MiddlewareStack.instance;
  }

  public use(
    _name: string,
    middleware: MiddlewareFunction,
    options: {
      order?: number;
      enabled?: boolean;
      conditions?: MiddlewareCondition[];
    } = {},
  ): MiddlewareStack {
    const definition: MiddlewareDefinition = {
      _name,
      middleware,
      order: options.order ?? 100,
      enabled: options.enabled ?? true,
      conditions: options.conditions,
    };

    this.middlewares.set(_name, definition);

    logger.debug("Middleware registered", {
      _name,
      order: definition.order,
      enabled: definition.enabled,
      hasConditions: !!definition.conditions?.length,
    });

    return this;
  }

  public useGlobal(middleware: MiddlewareFunction): MiddlewareStack {
    this.globalMiddlewares.push(middleware);
    return this;
  }

  public disable(_name: string): MiddlewareStack {
    const definition = this.middlewares.get(_name);
    if (definition) {
      definition.enabled = false;
      logger.debug("Middleware disabled", { _name });
    }
    return this;
  }

  public enable(_name: string): MiddlewareStack {
    const definition = this.middlewares.get(_name);
    if (definition) {
      definition.enabled = true;
      logger.debug("Middleware enabled", { _name });
    }
    return this;
  }

  public async process(request: NextRequest): Promise<NextResponse> {
    const context: MiddlewareContext = {
      requestId: this.generateRequestId(),
      startTime: Date.now(),
      metadata: new Map(),
    };

    // Log request start
    logger.info("Request processing started", {
      requestId: context.requestId,
      method: request.method,
      url: request.url,
      userAgent: request.headers.get("user-agent"),
    });

    try {
      // Get applicable middlewares
      const applicableMiddlewares = this.getApplicableMiddlewares(request);

      // Create middleware chain
      const chain = this.createMiddlewareChain(
        applicableMiddlewares,
        request,
        context,
      );

      // Execute chain
      const response = await chain();

      // Log request completion
      const duration = Date.now() - context.startTime;
      logger.info("Request processing completed", {
        requestId: context.requestId,
        duration,
        statusCode: response.status,
        middlewareCount: applicableMiddlewares.length,
      });

      return response;
    } catch (error) {
      const duration = Date.now() - context.startTime;
      logger.error("Request processing failed", {
        requestId: context.requestId,
        duration,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return new NextResponse(
        JSON.stringify({ error: "Internal Server Error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  public getMiddlewareInfo(): Array<{
    _name: string;
    order: number;
    enabled: boolean;
    conditionCount: number;
  }> {
    return Array.from(this.middlewares.values())
      .map((def) => ({
        _name: def._name,
        order: def.order,
        enabled: def.enabled,
        conditionCount: def.conditions?.length || 0,
      }))
      .sort((a, b) => a.order - b.order);
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getApplicableMiddlewares(
    request: NextRequest,
  ): MiddlewareDefinition[] {
    const applicable: MiddlewareDefinition[] = [];

    for (const [_name, definition] of this.middlewares) {
      if (!definition.enabled) continue;

      if (!definition.conditions || definition.conditions.length === 0) {
        applicable.push(definition);
        continue;
      }

      const conditionsMatch = definition.conditions.every((condition) =>
        this.evaluateCondition(condition, request),
      );

      if (conditionsMatch) {
        applicable.push(definition);
      }
    }

    // Sort by order
    return applicable.sort((a, b) => a.order - b.order);
  }

  private evaluateCondition(
    condition: MiddlewareCondition,
    request: NextRequest,
  ): boolean {
    let matches = false;

    switch (condition.type) {
      case "path":
        if (typeof condition.matcher === "string") {
          matches = request.nextUrl.pathname.includes(condition.matcher);
        } else if (condition.matcher instanceof RegExp) {
          matches = condition.matcher.test(request.nextUrl.pathname);
        }
        break;

      case "method":
        if (typeof condition.matcher === "string") {
          matches = request.method === condition.matcher.toUpperCase();
        }
        break;

      case "header":
        if (typeof condition.matcher === "string") {
          const [headerName, headerValue] = condition.matcher.split(":");
          const actualValue = request.headers.get(headerName);
          matches = actualValue === headerValue?.trim();
        }
        break;

      case "query":
        if (typeof condition.matcher === "string") {
          matches = request.nextUrl.searchParams.has(condition.matcher);
        }
        break;

      case "custom":
        if (typeof condition.matcher === "function") {
          matches = condition.matcher(request);
        }
        break;
    }

    return condition.negate ? !matches : matches;
  }

  private createMiddlewareChain(
    middlewares: MiddlewareDefinition[],
    request: NextRequest,
    context: MiddlewareContext,
  ): () => Promise<NextResponse> {
    let index = 0;

    const next = async (): Promise<NextResponse> => {
      // If we've processed all middlewares, return a default response
      if (index >= middlewares.length) {
        return NextResponse.next();
      }

      const middleware = middlewares[index++];

      try {
        return await middleware.middleware(request, context, next);
      } catch (error) {
        logger.error("Middleware execution failed", {
          middleware: middleware._name,
          requestId: context.requestId,
          error: error instanceof Error ? error.message : String(error),
        });

        // Continue to next middleware on error
        return next();
      }
    };

    return next;
  }

  private setupBuiltinMiddlewares(): void {
    // Security Headers Middleware
    this.use(
      "security-headers",
      async (request, context, next) => {
        const response = await next();

        // Add security headers
        response.headers.set("X-Content-Type-Options", "nosniff");
        response.headers.set("X-Frame-Options", "DENY");
        response.headers.set("X-XSS-Protection", "1; mode=block");
        response.headers.set(
          "Referrer-Policy",
          "strict-origin-when-cross-origin",
        );

        if (request.nextUrl.protocol === "https:") {
          response.headers.set(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains",
          );
        }

        return response;
      },
      { order: 10 },
    );

    // Request ID Middleware
    this.use(
      "request-id",
      async (request, context, next) => {
        const response = await next();
        response.headers.set("X-Request-ID", context.requestId);
        return response;
      },
      { order: 20 },
    );

    // CORS Middleware
    this.use(
      "cors",
      async (request, context, next) => {
        // Handle preflight requests
        if (request.method === "OPTIONS") {
          return new NextResponse(null, {
            status: 200,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type, Authorization",
              "Access-Control-Max-Age": "86400",
            },
          });
        }

        const response = await next();

        // Add CORS headers to actual requests
        response.headers.set("Access-Control-Allow-Origin", "*");
        response.headers.set("Access-Control-Allow-Credentials", "true");

        return response;
      },
      { order: 30 },
    );

    // Performance Monitoring Middleware
    this.use(
      "performance",
      async (request, context, next) => {
        const startTime = Date.now();
        const response = await next();
        const duration = Date.now() - startTime;

        response.headers.set("X-Response-Time", `${duration}ms`);

        // Log slow requests
        if (duration > 1000) {
          logger.warn("Slow request detected", {
            requestId: context.requestId,
            duration,
            path: request.nextUrl.pathname,
          });
        }

        return response;
      },
      { order: 40 },
    );
  }
}

// Export singleton instance
export const middlewareStack = MiddlewareStack.getInstance();

// Utility for creating conditional middlewares
export const createConditionalMiddleware = (
  conditions: MiddlewareCondition[],
  middleware: MiddlewareFunction,
): MiddlewareFunction => {
  return async (request, context, next) => {
    const shouldExecute = conditions.every((condition) =>
      middlewareStack["evaluateCondition"](condition, request),
    );

    if (shouldExecute) {
      return middleware(request, context, next);
    } else {
      return next();
    }
  };
};
