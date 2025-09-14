/**
 * Enterprise Error Handler
 * Phase 1 Enhancement: Comprehensive error handling, recovery, and reporting
 */

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export interface ErrorContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  path: string;
  method: string;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
  metadata?: Record<string, any>;
}

export interface ErrorInfo {
  name: string;
  message: string;
  stack?: string;
  code?: string;
  statusCode: number;
  context: ErrorContext;
  recoverable: boolean;
  retryable: boolean;
}

export interface ErrorRecoveryStrategy {
  name: string;
  canHandle: (error: Error, context: ErrorContext) => boolean;
  handle: (error: Error, context: ErrorContext) => Promise<NextResponse | null>;
  priority: number;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private recoveryStrategies: Map<string, ErrorRecoveryStrategy> = new Map();
  private errorStats: Map<string, { count: number; lastOccurrence: Date }> =
    new Map();

  private constructor() {
    this.setupBuiltinRecoveryStrategies();
    this.setupGlobalErrorHandlers();
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  public async handleError(
    error: Error,
    request?: NextRequest,
    context?: Partial<ErrorContext>,
  ): Promise<NextResponse> {
    const errorContext = this.createErrorContext(error, request, context);
    const errorInfo = this.createErrorInfo(error, errorContext);

    // Log error
    this.logError(errorInfo);

    // Update error statistics
    this.updateErrorStats(errorInfo);

    // Attempt recovery
    const recoveryResponse = await this.attemptRecovery(error, errorContext);
    if (recoveryResponse) {
      return recoveryResponse;
    }

    // Fallback error response
    return this.createErrorResponse(errorInfo);
  }

  public registerRecoveryStrategy(
    strategy: ErrorRecoveryStrategy,
  ): ErrorHandler {
    this.recoveryStrategies.set(strategy.name, strategy);

    logger.debug("Error recovery strategy registered", {
      strategy: strategy.name,
      priority: strategy.priority,
    });

    return this;
  }

  public removeRecoveryStrategy(name: string): ErrorHandler {
    this.recoveryStrategies.delete(name);
    return this;
  }

  public getErrorStats(): Array<{
    error: string;
    count: number;
    lastOccurrence: Date;
  }> {
    return Array.from(this.errorStats.entries()).map(([error, stats]) => ({
      error,
      ...stats,
    }));
  }

  public clearErrorStats(): void {
    this.errorStats.clear();
  }

  // Wrap async functions with error handling
  public async wrapAsync<T>(
    fn: () => Promise<T>,
    context?: Partial<ErrorContext>,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof Error) {
        throw await this.enhanceError(error, context);
      }
      throw error;
    }
  }

  // Wrap sync functions with error handling
  public wrapSync<T>(fn: () => T, context?: Partial<ErrorContext>): T {
    try {
      return fn();
    } catch (error) {
      if (error instanceof Error) {
        const enhanced = this.enhanceError(error, context);
        throw enhanced;
      }
      throw error;
    }
  }

  private createErrorContext(
    error: Error,
    request?: NextRequest,
    context?: Partial<ErrorContext>,
  ): ErrorContext {
    return {
      requestId: context?.requestId || "unknown",
      userId: context?.userId,
      sessionId: context?.sessionId,
      path: request?.nextUrl?.pathname || context?.path || "unknown",
      method: request?.method || context?.method || "unknown",
      timestamp: new Date(),
      userAgent: request?.headers?.get("user-agent") || context?.userAgent,
      ip: request?.ip || context?.ip,
      metadata: context?.metadata,
    };
  }

  private createErrorInfo(error: Error, context: ErrorContext): ErrorInfo {
    const statusCode = this.getStatusCodeFromError(error);

    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
      statusCode,
      context,
      recoverable: this.isRecoverable(error, statusCode),
      retryable: this.isRetryable(error, statusCode),
    };
  }

  private getStatusCodeFromError(error: Error): number {
    // Check for specific error types
    if (error.name === "ValidationError") return 400;
    if (error.name === "UnauthorizedError") return 401;
    if (error.name === "ForbiddenError") return 403;
    if (error.name === "NotFoundError") return 404;
    if (error.name === "ConflictError") return 409;
    if (error.name === "RateLimitError") return 429;

    // Check for database errors
    if (
      error.message.includes("connection") ||
      error.message.includes("timeout")
    ) {
      return 503;
    }

    // Check for explicit status code
    if ((error as any).statusCode) {
      return (error as any).statusCode;
    }

    // Default to 500
    return 500;
  }

  private isRecoverable(error: Error, statusCode: number): boolean {
    // 4xx errors are generally not recoverable (client errors)
    if (statusCode >= 400 && statusCode < 500) {
      return false;
    }

    // Some 5xx errors might be recoverable
    if (statusCode === 503 || statusCode === 502) {
      return true;
    }

    // Database connection errors might be recoverable
    if (
      error.message.includes("connection") ||
      error.message.includes("timeout")
    ) {
      return true;
    }

    return false;
  }

  private isRetryable(error: Error, statusCode: number): boolean {
    // Rate limit errors are retryable
    if (statusCode === 429) return true;

    // Temporary server errors are retryable
    if (statusCode >= 502 && statusCode <= 504) return true;

    // Connection errors are retryable
    if (
      error.message.includes("ECONNRESET") ||
      error.message.includes("timeout")
    ) {
      return true;
    }

    return false;
  }

  private logError(errorInfo: ErrorInfo): void {
    const logLevel = errorInfo.statusCode >= 500 ? "error" : "warn";

    logger[logLevel]("Error handled", {
      error: {
        name: errorInfo.name,
        message: errorInfo.message,
        code: errorInfo.code,
        statusCode: errorInfo.statusCode,
        recoverable: errorInfo.recoverable,
        retryable: errorInfo.retryable,
      },
      context: errorInfo.context,
      stack: errorInfo.stack,
    });
  }

  private updateErrorStats(errorInfo: ErrorInfo): void {
    const errorKey = `${errorInfo.name}:${errorInfo.statusCode}`;
    const stats = this.errorStats.get(errorKey) || {
      count: 0,
      lastOccurrence: new Date(),
    };

    stats.count++;
    stats.lastOccurrence = new Date();

    this.errorStats.set(errorKey, stats);
  }

  private async attemptRecovery(
    error: Error,
    context: ErrorContext,
  ): Promise<NextResponse | null> {
    // Get applicable recovery strategies
    const strategies = Array.from(this.recoveryStrategies.values())
      .filter((strategy) => strategy.canHandle(error, context))
      .sort((a, b) => a.priority - b.priority);

    // Try each strategy
    for (const strategy of strategies) {
      try {
        const response = await strategy.handle(error, context);
        if (response) {
          logger.info("Error recovered using strategy", {
            strategy: strategy.name,
            error: error.name,
            requestId: context.requestId,
          });
          return response;
        }
      } catch (recoveryError) {
        logger.warn("Recovery strategy failed", {
          strategy: strategy.name,
          error: error.name,
          recoveryError:
            recoveryError instanceof Error
              ? recoveryError.message
              : String(recoveryError),
        });
      }
    }

    return null;
  }

  private createErrorResponse(errorInfo: ErrorInfo): NextResponse {
    // Don't expose internal error details in production
    const isDevelopment = process.env.NODE_ENV === "development";

    const responseBody = {
      error: {
        message:
          errorInfo.statusCode >= 500 && !isDevelopment
            ? "Internal Server Error"
            : errorInfo.message,
        code: errorInfo.code,
        statusCode: errorInfo.statusCode,
        requestId: errorInfo.context.requestId,
        ...(isDevelopment && {
          name: errorInfo.name,
          stack: errorInfo.stack,
          context: errorInfo.context,
        }),
      },
    };

    return new NextResponse(JSON.stringify(responseBody), {
      status: errorInfo.statusCode,
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": errorInfo.context.requestId || "unknown",
      },
    });
  }

  private async enhanceError(
    error: Error,
    context?: Partial<ErrorContext>,
  ): Promise<Error> {
    // Add context to error
    if (context) {
      (error as any).context = context;
    }

    return error;
  }

  private setupBuiltinRecoveryStrategies(): void {
    // Database connection recovery
    this.registerRecoveryStrategy({
      name: "database-reconnection",
      priority: 10,
      canHandle: (error) => {
        return (
          error.message.includes("connection") ||
          error.message.includes("ECONNREFUSED") ||
          error.message.includes("timeout")
        );
      },
      handle: async (error, context) => {
        // This would attempt to reconnect to the database
        // For now, return a service unavailable response
        return new NextResponse(
          JSON.stringify({
            error: {
              message:
                "Service temporarily unavailable. Please try again later.",
              code: "DATABASE_UNAVAILABLE",
              statusCode: 503,
              requestId: context.requestId,
            },
          }),
          {
            status: 503,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": "30",
            },
          },
        );
      },
    });

    // Rate limit recovery
    this.registerRecoveryStrategy({
      name: "rate-limit-recovery",
      priority: 20,
      canHandle: (error) => {
        return (
          error.name === "RateLimitError" ||
          error.message.includes("rate limit")
        );
      },
      handle: async (error, context) => {
        return new NextResponse(
          JSON.stringify({
            error: {
              message: "Rate limit exceeded. Please try again later.",
              code: "RATE_LIMITED",
              statusCode: 429,
              requestId: context.requestId,
            },
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": "60",
            },
          },
        );
      },
    });
  }

  private setupGlobalErrorHandlers(): void {
    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      logger.fatal("Uncaught exception", {
        error: error.message,
        stack: error.stack,
      });

      // Give time for logs to flush, then exit
      setTimeout(() => process.exit(1), 1000);
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason) => {
      logger.fatal("Unhandled promise rejection", {
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
      });
    });
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Utility functions
export const createError = (
  name: string,
  message: string,
  statusCode: number = 500,
  code?: string,
) => {
  const error = new Error(message);
  error.name = name;
  (error as any).statusCode = statusCode;
  if (code) {
    (error as any).code = code;
  }
  return error;
};

export const isOperationalError = (error: Error): boolean => {
  return !!(error as any).statusCode && (error as any).statusCode < 500;
};
