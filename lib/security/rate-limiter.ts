import { Redis } from "@upstash/redis";
import { env } from "@/lib/env/validation";

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (identifier: string) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  totalHits: number;
}

export interface RateLimitOptions {
  identifier: string;
  config: RateLimitConfig;
}

export class EdgeRateLimiter {
  private redis: Redis | null = null;
  private memoryStore = new Map<string, { count: number; resetTime: number }>();

  constructor() {
    // Initialize Redis if available
    if (env.UPSTASH_REDIS_URL && env.UPSTASH_REDIS_TOKEN) {
      this.redis = new Redis({
        url: env.UPSTASH_REDIS_URL,
        token: env.UPSTASH_REDIS_TOKEN,
      });
    }
  }

  /**
   * Check rate limit for a given identifier
   */
  async checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
    const { identifier, config } = options;
    const key = config.keyGenerator
      ? config.keyGenerator(identifier)
      : `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      if (this.redis) {
        return await this.checkRedisRateLimit(key, config, now, windowStart);
      } else {
        return this.checkMemoryRateLimit(key, config, now, windowStart);
      }
    } catch (error) {
      console.error("Rate limit check failed:", error);
      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: new Date(now + config.windowMs),
        totalHits: 1,
      };
    }
  }

  /**
   * Redis-based rate limiting
   */
  private async checkRedisRateLimit(
    key: string,
    config: RateLimitConfig,
    now: number,
    windowStart: number,
  ): Promise<RateLimitResult> {
    const pipeline = this.redis!.pipeline();

    // Remove expired entries
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Count current requests in window
    pipeline.zcard(key);

    // Add current request
    pipeline.zadd(key, { score: now, member: `${now}-${Math.random()}` });

    // Set expiration
    pipeline.expire(key, Math.ceil(config.windowMs / 1000));

    const results = await pipeline.exec();
    const currentCount = (results[1] as number) + 1; // +1 for the request we just added

    const allowed = currentCount <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - currentCount);
    const resetTime = new Date(now + config.windowMs);

    return {
      allowed,
      remaining,
      resetTime,
      totalHits: currentCount,
    };
  }

  /**
   * Memory-based rate limiting (fallback)
   */
  private checkMemoryRateLimit(
    key: string,
    config: RateLimitConfig,
    now: number,
    windowStart: number,
  ): RateLimitResult {
    const entry = this.memoryStore.get(key);

    if (!entry || entry.resetTime <= now) {
      // New window
      const newEntry = {
        count: 1,
        resetTime: now + config.windowMs,
      };
      this.memoryStore.set(key, newEntry);

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: new Date(newEntry.resetTime),
        totalHits: 1,
      };
    }

    // Existing window
    entry.count++;
    const allowed = entry.count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - entry.count);

    return {
      allowed,
      remaining,
      resetTime: new Date(entry.resetTime),
      totalHits: entry.count,
    };
  }

  /**
   * Clean up expired entries from memory store
   */
  cleanupMemoryStore(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryStore.entries()) {
      if (entry.resetTime <= now) {
        this.memoryStore.delete(key);
      }
    }
  }

  /**
   * Clear failed attempts for a specific identifier
   */
  async clearAttempts(identifier: string): Promise<void> {
    if (this.redis) {
      const key = `brute_force:${identifier}`;
      await this.redis.del(key);
    } else {
      const key = `brute_force:${identifier}`;
      this.memoryStore.delete(key);
    }
  }
}

// Predefined rate limit configurations
export const RATE_LIMIT_CONFIGS = {
  // API endpoints
  API_GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  },
  API_STRICT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 20,
  },

  // Authentication
  AUTH_LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
  },
  AUTH_REGISTER: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
  },
  AUTH_PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
  },

  // 2FA
  TWO_FACTOR_VERIFY: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10,
  },
  TWO_FACTOR_SETUP: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5,
  },

  // File uploads
  FILE_UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50,
  },

  // Search
  SEARCH: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
  },
} as const;

// Singleton instance
export const rateLimiter = new EdgeRateLimiter();

// Utility functions
export function getClientIdentifier(request: Request): string {
  // Try to get IP from various headers
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  const ip =
    forwardedFor?.split(",")[0] || realIp || cfConnectingIp || "unknown";

  // Include user agent for additional uniqueness
  const userAgent = request.headers.get("user-agent") || "unknown";
  const userAgentHash = hashString(userAgent);

  return `${ip}:${userAgentHash}`;
}

export function getUserIdentifier(userId: string): string {
  return `user:${userId}`;
}

export function getEndpointIdentifier(request: Request): string {
  const url = new URL(request.url);
  return `endpoint:${url.pathname}`;
}

// Simple hash function for user agent
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Rate limit response helpers
export function createRateLimitResponse(
  result: RateLimitResult,
  config: RateLimitConfig,
): Response {
  const headers = new Headers({
    "X-RateLimit-Limit": config.maxRequests.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.resetTime.getTime().toString(),
    "Retry-After": Math.ceil(
      (result.resetTime.getTime() - Date.now()) / 1000,
    ).toString(),
  });

  return new Response(
    JSON.stringify({
      error: "Too Many Requests",
      message: "Rate limit exceeded. Please try again later.",
      retryAfter: result.resetTime.toISOString(),
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        ...Object.fromEntries(headers.entries()),
      },
    },
  );
}

// Middleware helper for Next.js
export async function applyRateLimit(
  request: Request,
  config: RateLimitConfig,
  identifier?: string,
): Promise<{ allowed: boolean; response?: Response }> {
  const clientId = identifier || getClientIdentifier(request);

  const result = await rateLimiter.checkRateLimit({
    identifier: clientId,
    config,
  });

  if (!result.allowed) {
    return {
      allowed: false,
      response: createRateLimitResponse(result, config),
    };
  }

  return { allowed: true };
}

// Brute force protection
export class BruteForceProtection {
  private static readonly ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 60 * 60 * 1000; // 1 hour

  static async checkBruteForce(identifier: string): Promise<{
    allowed: boolean;
    attemptsRemaining: number;
    lockoutUntil?: Date;
  }> {
    const config: RateLimitConfig = {
      windowMs: this.ATTEMPT_WINDOW,
      maxRequests: this.MAX_ATTEMPTS,
      keyGenerator: (id) => `brute_force:${id}`,
    };

    const result = await rateLimiter.checkRateLimit({
      identifier,
      config,
    });

    if (!result.allowed) {
      return {
        allowed: false,
        attemptsRemaining: 0,
        lockoutUntil: new Date(Date.now() + this.LOCKOUT_DURATION),
      };
    }

    return {
      allowed: true,
      attemptsRemaining: result.remaining,
    };
  }

  static async recordFailedAttempt(identifier: string): Promise<void> {
    await this.checkBruteForce(identifier);
  }

  static async clearFailedAttempts(identifier: string): Promise<void> {
    await rateLimiter.clearAttempts(identifier);
  }
}
